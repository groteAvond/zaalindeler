const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  addGuest: (guest) => ipcRenderer.invoke('add-guest', guest),
  sortUsers: () => ipcRenderer.invoke('sortUsers'),
  updateSeatPriority: (rowNumber, seatNumber, newPriority) => ipcRenderer.invoke('update-seat-priority', rowNumber, seatNumber, newPriority),
  getSeatPriority: (seatPriority, ) => ipcRenderer.invoke('get-seat-priority',seatPriority),
  deleteSeatPriority: () => ipcRenderer.invoke('delete-seat-priority'),
  deleteGuest: (guest) => ipcRenderer.invoke('delete-guest', guest),
  deleteAllUsers: () => ipcRenderer.invoke('delete-all-users'),
  addGuestsBulk: (guests) => ipcRenderer.invoke('add-guests-bulk', guests),
  exportUsers: () => ipcRenderer.invoke('export-users'),
  resetSeating: () => ipcRenderer.invoke('reset-seating'),
  getSeatsForDay: (day) => ipcRenderer.invoke('get-seats-for-day', day),
  getDayAssignments: () => ipcRenderer.invoke('get-day-assignments'),
  getGuests: () => ipcRenderer.invoke('get-guests'),
  updateGuest: (guest) => ipcRenderer.invoke('update-guest', guest),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Add new method to listen for seating ready event
  onSeatingReady: (callback) => {
    const removeListener = () => ipcRenderer.removeListener('seating-ready', callback);
    ipcRenderer.on('seating-ready', callback);
    return removeListener;
  },

  onInitProgress: (callback) => {
    const removeListener = () => ipcRenderer.removeListener('initialization-progress', callback);
    ipcRenderer.on('initialization-progress', (_, progress) => callback(progress));
    return removeListener;
  },

  getSeatingStatus: () => ipcRenderer.invoke('get-seating-status'),

  onDatabaseError: (callback) => {
    const removeListener = () => ipcRenderer.removeListener('database-connection-error', callback);
    ipcRenderer.on('database-connection-error', (_, error) => callback(error));
    return removeListener;
  },

  // Add new methods for blocked seats
  getBlockedSeats: (day) => ipcRenderer.invoke('get-blocked-seats', day),
  blockSeat: (blockedSeat) => ipcRenderer.invoke('block-seat', blockedSeat),
  unblockSeat: (day, row, seat) => ipcRenderer.invoke('unblock-seat', day, row, seat),
  unblockAllSeats: () => ipcRenderer.invoke('unblock-all-seats'),
  getAlgorithmLogs: () => ipcRenderer.invoke('get-algorithm-logs'),
});

console.log('preload.js loaded');