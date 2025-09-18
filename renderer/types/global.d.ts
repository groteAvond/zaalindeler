interface ElectronAPI {
  getGuests: () => Promise<any[]>;
  getSettings: () => Promise<any>;
  updateSettings: (settings: any) => Promise<void>;
  addGuest: (guest: any) => Promise<any>;
  updateGuest: (guest: any) => Promise<any>;
  deleteGuest: (id: number) => Promise<void>;
  deleteAllUsers: () => Promise<void>;
  addGuestsBulk: (guests: any[]) => Promise<void>;
  sortUsers: () => Promise<any>;
  updateSeatPriority: (rowNumber: number, seatNumber: number, newPriority: number) => Promise<void>;
  updateSeatStatus: (rowNumber: number, seatNumber: number, status: boolean) => Promise<void>;
  updateDayAssignments: (dayData: any) => Promise<void>;
  resetSeating: () => Promise<void>;
  getSeats: () => Promise<any>;
  getSeatingStatus: () => Promise<any>;
  setSeatingStatus: (status: any) => Promise<void>;
  exportUsers: () => Promise<{success: boolean, path: string, count: number}>;
  blockSeat: (seat: any) => Promise<void>;
  unblockSeat: (id: number) => Promise<void>;
  unblockAllSeats: () => Promise<void>;
  getBlockedSeats: () => Promise<any[]>;
  getAlgorithmLogs: () => Promise<any[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}