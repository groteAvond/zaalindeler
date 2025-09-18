// global.d.ts
interface Window {
    electronAPI: {
      addGuest: (guest: any) => Promise<any>;
      sortUsers: () => Promise<any>;
      updateSeatPriority: (seatNumber: number, newPriority: number, rowNumber: number) => Promise<void>;
      getSeatPriority: (seatNumber: number) => Promise<number>;
      deleteSeatPriority: () => Promise<void>;
      deleteGuest: (guest: any) => Promise<void>;
      deleteAllUsers: () => Promise<void>;
      addGuestsBulk: (guests: any[]) => Promise<any[]>;
      exportUsers: () => Promise<{ success: boolean; path: string; count: number }>;
      resetSeating: () => Promise<void>;
      getSeatsForDay: (day: string) => Promise<any>;
      getDayAssignments: () => Promise<any>;
      getGuests: () => Promise<Guest[]>;
      updateGuest: (guest: Guest) => Promise<void>;
      updateSettings: (settings: any) => Promise<void>;
      getSettings: () => Promise<any>;
      onSeatingReady: (callback: () => void) => (() => void);
      onInitProgress: (callback: (progress: number) => void) => (() => void);
      getSeatingStatus: () => Promise<{
        isDone: boolean;
        lastUpdated: string;
        estimatedTimeMs?: number;
        startTime?: string;
        guestsToProcess?: number;
        processedGuests?: number;
      }>;
      onDatabaseError: (callback: (error: { 
        message: string; 
        warning: string;
      }) => void) => (() => void);
      getBlockedSeats: (day?: string) => Promise<BlockedSeat[]>;
      blockSeat: (blockedSeat: BlockedSeat) => Promise<boolean>;
      unblockSeat: (day: string, row: number, seatNumber: number) => Promise<boolean>;
      unblockAllSeats: () => Promise<boolean>;
      getAlgorithmLogs: () => Promise<AlgorithmLog[]>;
    };
}

interface DaySeating {
  [day: string]: {
    seats: any[];
    capacity: number;
    assigned: number;
  }
}