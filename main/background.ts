import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { app, BrowserWindow, ipcMain, nativeTheme } from "electron"; // Remove dialog
import serve from "electron-serve";
import { redis as db } from "./helpers/redisClient";
import {
  getGuests,
  addGuest,
  addGuestsBulk,
  addSeat,
  getSeats,
  connect,
  deleteGuest,
  deleteAllUsers,
  getSeatsForDay,
  setSeatsForDay,
  getDayAssignments,
  updateDayAssignments,
  resetSeatingAndAssignments,
  TOTAL_CAPACITY,
  setSeatingStatus,
  getSeatingStatus,
  getSettings,
  getBlockedSeats,
  blockSeat,
  unblockSeat,
  unblockAllSeats
} from "./helpers/database";
import { autoAssignSeating } from "./helpers/algorithm";
import { Guest } from "../renderer/types/guest";
const fs = require("fs");
const isProd: boolean = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    icon: path.join(__dirname, '../resources/icon.ico'),
    width: 1200, // Increased width
    height: 800, // Increased height
    fullscreen: true, // Add this line to make it fullscreen
    webPreferences: {
      preload: path.join(__dirname, "../main/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Load window first
  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }

  // Start initialization after window is loaded
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      // Send progress updates
      const sendProgress = (progress: number) => {
        mainWindow.webContents.send('initialization-progress', progress);
      };

      // Initial progress
      sendProgress(10);
      sendProgress(40);
      
      const guests = await getGuests();
      sendProgress(60);
      
      // Remove auto-reset and auto-assign
      // if (guests.length > 0) {
      //   sendProgress(80);
      //   await autoAssignSeating(guests);
      // }
      
      // Final progress
      sendProgress(100);
      
      // Short delay before sending ready event
      setTimeout(() => {
        mainWindow.webContents.send('seating-ready');
      }, 500);
      
    } catch (error) {
      console.error('Failed to initialize seating:', error);
    }
  });

  return mainWindow;
};

(async () => {
  await app.whenReady();
  let mainWindow: BrowserWindow | null = null;

  try {
    const connected = await connect();
    mainWindow = await createWindow();
    
    if (!connected) {
      mainWindow.webContents.send('database-connection-error', {
        message: 'Database verbinding mislukt - offline modus geactiveerd',
        warning: 'Let op: Wijzigingen worden niet opgeslagen. Exporteer uw data zodra mogelijk.'
      });
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    if (!mainWindow) {
      mainWindow = await createWindow();
    }
    mainWindow.webContents.send('database-connection-error', {
      message: 'Database verbinding mislukt - offline modus geactiveerd',
      warning: 'Let op: Wijzigingen worden niet opgeslagen. Exporteer uw data zodra mogelijk.'
    });
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle("add-guest", async (event, guest) => {
    try {
      await addGuest(guest);
      return true;
    } catch (error) {
      console.error("Error adding guest:", error);
      return false;
    }
  });
  
  // Add this new handler for algorithm logs
  ipcMain.handle("get-algorithm-logs", async () => {
    try {
      return await getAlgorithmLogs();
    } catch (error) {
      console.error("Error getting algorithm logs:", error);
      return [];
    }
  });

  ipcMain.handle("sortUsers", async () => {
    const guests = await getGuests();
    await autoAssignSeating(guests);
    return await getSeats();
  });
  ipcMain.handle(
    "update-seat-priority",
    async (event, rowNumber, seatNumber, newPriority) => {
      db.set(`priorityMatrix.${rowNumber}.${seatNumber}.priority`, newPriority);
    }
  );
  ipcMain.handle("get-seat-priority", async (event, seatNumber) => {
    const priorityMatrixString = await db.get("priorityMatrix");
    const priorityMatrix = priorityMatrixString ? JSON.parse(priorityMatrixString) : {};
    return priorityMatrix[seatNumber].priority;
  });
  ipcMain.handle("delete-seat-priority", async (event) => {
    db.del("priorityMatrix");
  });
  ipcMain.handle("delete-guest", async (event, guest) => {
    try {
      await deleteGuest(guest);
      return true;
    } catch (error) {
      console.error("Error deleting guest:", error);
      return false;
    }
  });

  ipcMain.handle("add-guests-bulk", async (event, guests) => {
    try {
      await addGuestsBulk(guests);
      // Uncomment and update this section to run seating algorithm after bulk import
      const allGuests = await getGuests();
      
      // Calculate estimated time
      const estimatedTime = await calculateSeatingTime(allGuests);
      
      // Set initial status
      await setSeatingStatus(false, {
        estimatedTimeMs: estimatedTime,
        startTime: new Date().toISOString(),
        guestsToProcess: allGuests.length,
        processedGuests: 0
      });

      // Reset and run seating algorithm
      // await resetSeatingAndAssignments();
      // await autoAssignSeating(allGuests);
      
      // // Update status when complete
      // await setSeatingStatus(true);
      
      return true;
    } catch (error) {
      console.error("Error bulk adding guests:", error);
      return false;
    }
  });

  ipcMain.handle("get-seats-for-day", async (event, day) => {
    try {
      const seatsData = await getSeatsForDay(day);
      return seatsData;
    } catch (error) {
      console.error("Error fetching seats for day:", error);
      throw error;
    }
  });

  ipcMain.handle("get-day-assignments", async () => {
    try {
      const assignments = await getDayAssignments();
      return assignments;
    } catch (error) {
      console.error("Error fetching day assignments:", error);
      throw error;
    }
  });

  ipcMain.handle("delete-all-users", async () => {
    try {
      await deleteAllUsers();
      return true;
    } catch (error) {
      console.error("Error deleting all users:", error);
      return false;
    }
  });

  ipcMain.handle("export-users", async () => {
    try {
      const guests = await getGuests();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(app.getPath('downloads'), `guests-${timestamp}.json`);
      
      await fs.promises.writeFile(filePath, JSON.stringify(guests, null, 2));
      
      return {
        success: true,
        path: filePath,
        count: guests.length
      };
    } catch (error) {
      console.error("Error exporting users:", error);
      throw error;
    }
  });

  async function calculateSeatingTime(guests: Guest[]): Promise<number> {
    // Add small delay to prevent flicker
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Take 20% of total guests as sample size, minimum 10, maximum 50
    const sampleSize = Math.min(Math.max(Math.ceil(guests.length * 0.2), 10), 50);
    
    // Take samples from different parts of the array for better representation
    const sampleGuests: Guest[] = [];
    const step = Math.floor(guests.length / sampleSize);
    
    for (let i = 0; i < sampleSize && i * step < guests.length; i++) {
      sampleGuests.push(guests[i * step]);
    }
  
    // Run multiple trials for more accurate average
    const trials = 3;
    let totalTime = 0;
  
    for (let i = 0; i < trials; i++) {
      const startTime = Date.now();
      await autoAssignSeating(sampleGuests);
      const endTime = Date.now();
      totalTime += endTime - startTime;
    }
  
    // Calculate average time per guest
    const averageTimePerGuest = (totalTime / trials) / sampleSize;
    
    // Add 20% buffer for safety
    const estimatedTime = Math.ceil(averageTimePerGuest * guests.length * 1.2);
    
    console.log('Time estimation:', {
      sampleSize,
      trials,
      totalTime,
      averageTimePerGuest,
      estimatedTime,
      totalGuests: guests.length
    });
  
    return estimatedTime * 2.3;
  }

  ipcMain.handle("reset-seating", async () => {
    try {
      const guests = await getGuests();
      if (guests.length === 0) return;
  
      // Calculate estimated time
      const estimatedTime = await calculateSeatingTime(guests);
      
      // Set initial status with time estimate
      await setSeatingStatus(false, {
        estimatedTimeMs: estimatedTime,
        startTime: new Date().toISOString(),
        guestsToProcess: guests.length,
        processedGuests: 0
      });
  
      // Start the actual seating process
      const realStartTime = Date.now();
      await resetSeatingAndAssignments();
      await autoAssignSeating(guests);
      const realEndTime = Date.now();
  
      // Log accuracy of estimation
      const actualTime = realEndTime - realStartTime;
      console.log('Timing accuracy:', {
        estimated: estimatedTime,
        actual: actualTime,
        difference: estimatedTime - actualTime,
        percentageOff: ((estimatedTime - actualTime) / actualTime) * 100
      });
  
      await setSeatingStatus(true);
    } catch (error) {
      console.error("Error resetting seating:", error);
      throw error;
    }
  });

  ipcMain.handle("get-seating-status", async () => {
    try {
      const status = await getSeatingStatus();
      return status;
    } catch (error) {
      console.error("Error getting seating status:", error);
      // Return a default status instead of throwing
      return { 
        isDone: true, 
        lastUpdated: new Date().toISOString(),
        offline: true
      };
    }
  });

  ipcMain.handle("get-guests", async () => {
    try {
      const guests = await getGuests();
      return guests;
    } catch (error) {
      console.error("Error fetching guests:", error);
      throw error;
    }
  });

  ipcMain.handle("update-guest", async (event, guest) => {
    try {
      const guests = await getGuests();
      const index = guests.findIndex((g: Guest) => g.id === guest.id);
      if (index !== -1) {
        guests[index] = guest;
        await db.set('guests', JSON.stringify(guests));
        // Re-run seating algorithm after guest update
        await autoAssignSeating(guests);
      }
      return true;
    } catch (error) {
      console.error("Error updating guest:", error);
      throw error;
    }
  });

  ipcMain.handle("update-settings", async (event, settings) => {
    try {
      // Validate settings
      const validatedSettings = {
        ...settings,
        useBalconyThreshold: Math.max(0, Math.min(100, settings.useBalconyThreshold ?? 95)),
        maxVIPRowDeviation: Math.max(0, Math.min(5, settings.maxVIPRowDeviation ?? 2))
      };
      
      await db.set('settings', JSON.stringify(validatedSettings));
      
      // Rerun seating if needed
      const guests = await getGuests();
      if (guests.length > 0) {
        await resetSeatingAndAssignments();
        await autoAssignSeating(guests);
      }
      
      return true;
    } catch (error) {
      console.error("Error updating settings:", error);
      return false;
    }
  });

  ipcMain.handle("get-settings", async () => {
    try {
      const settingsStr = await db.get('settings');
      return settingsStr ? JSON.parse(settingsStr) : null;
    } catch (error) {
      console.error("Error getting settings:", error);
      return null;
    }
  });

  // Add new handlers for blocked seats
  ipcMain.handle("get-blocked-seats", async (event, day) => {
    try {
      return await getBlockedSeats(day);
    } catch (error) {
      console.error("Error getting blocked seats:", error);
      return [];
    }
  });

  ipcMain.handle("block-seat", async (event, blockedSeat) => {
    try {
      await blockSeat(blockedSeat);
      
      // Rerun seating algorithm to apply changes
      const guests = await getGuests();
      if (guests.length > 0) {
        // Calculate estimated time
        const estimatedTime = await calculateSeatingTime(guests);
        
        // Set initial status
        await setSeatingStatus(false, {
          estimatedTimeMs: estimatedTime,
          startTime: new Date().toISOString(),
          guestsToProcess: guests.length,
          processedGuests: 0
        });
  
        await resetSeatingAndAssignments();
        await autoAssignSeating(guests);
        
        // Update status when complete
        await setSeatingStatus(true);
      }
      
      return true;
    } catch (error) {
      console.error("Error blocking seat:", error);
      return false;
    }
  });

  ipcMain.handle("unblock-seat", async (event, day, row, seat) => {
    try {
      await unblockSeat(day, row, seat);
      
      // Rerun seating algorithm to apply changes
      const guests = await getGuests();
      if (guests.length > 0) {
        // Calculate estimated time
        const estimatedTime = await calculateSeatingTime(guests);
        
        // Set initial status
        await setSeatingStatus(false, {
          estimatedTimeMs: estimatedTime,
          startTime: new Date().toISOString(),
          guestsToProcess: guests.length,
          processedGuests: 0
        });
  
        await resetSeatingAndAssignments();
        await autoAssignSeating(guests);
        
        // Update status when complete
        await setSeatingStatus(true);
      }
      
      return true;
    } catch (error) {
      console.error("Error unblocking seat:", error);
      return false;
    }
  });

  ipcMain.handle("unblock-all-seats", async () => {
    try {
      await unblockAllSeats();
      
      // Rerun seating algorithm to apply changes
      const guests = await getGuests();
      if (guests.length > 0) {
        await resetSeatingAndAssignments();
        await autoAssignSeating(guests);
      }
      
      return true;
    } catch (error) {
      console.error("Error unblocking all seats:", error);
      return false;
    }
  });
})();

app.on("window-all-closed", () => {
  app.quit();
});
