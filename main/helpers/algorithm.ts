import { zaalIndeling, ZaalIndeling } from './zaalIndeling';
import { db } from './redisClient';
import { getGuests, getSeatsForDay, setSeatsForDay, getDayAssignments, updateDayAssignments, type Day, type DaySeating, TOTAL_CAPACITY, getBlockedSeats, logAlgorithm, unblockSeat } from './database';
import { dialog, BrowserWindow } from 'electron';

// Custom error classes
export class SeatingError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'warning' | 'error',
    public solution?: string
  ) {
    super(message);
    this.name = 'SeatingError';
  }
}

export class CapacityError extends SeatingError {
  constructor(guests: number, capacity: number) {
    super(
      `Te veel gasten voor beschikbare stoelen (${guests} gasten, ${capacity} stoelen)`,
      'CAPACITY_EXCEEDED',
      'error',
      'Verdeel de gasten over meerdere dagen of verhoog de zaalcapaciteit'
    );
  }
}

export class PreferenceConflictError extends SeatingError {
  constructor(guestName: string, conflictingPreferences: string[]) {
    super(
      `Kan geen plek vinden voor ${guestName} met voorkeuren: ${conflictingPreferences.join(', ')}`,
      'PREFERENCE_CONFLICT',
      'warning',
      'Controleer de voorkeuren van de gast en pas deze indien nodig aan'
    );
  }
}

interface AlgorithmSettings {
  idealRowStart: number;
  idealRowEnd: number;
  useBalconyThreshold: number;
  maxVIPRowDeviation: number;
  preferCenterSeats: boolean;
  prioritizePreferences: boolean;
  maxMovesForPreference: number;
  balconyPenalty: number;
  allowRegularToVIPPreference: boolean; // New setting for allowing regular guests to select VIPs
  requireMutualPreference: boolean; // New setting for requiring mutual preference
}

interface Guest {
  voornaam: string;
  achternaam: string;
  isErelid: boolean;
  speeltMee: boolean;
  isDocent: boolean;
  aantalKaarten: string;
  voorkeurDag1: string;
  voorkeurDag2: string;
  voorkeurPersoonen: string;
  voorkeurEmail?: string; // Add this line
  email: string;
  id: number;
  leerlingnummer: number;
  IoVivat: boolean;
  datumAanmelding: any;
}

interface SeatAssignment {
  stoel: number;
  guest: Guest | null;
  priority: number;
  together?: boolean;
  blocked?: boolean;  // Add blocked property
  reason?: string;    // Add reason property
}

interface SeatingPreference {
  guest: Guest;
  preferredGuest: Guest;
  isMutualPreference?: boolean; // Add this property
  isTeacherPreference?: boolean; // Add this property
}

interface SeatOption {
  rowIndex: number;
  seatIndex: number;
  score: number;
  isBalcony: boolean;
}

// Update interface to include indexing
interface RowData {
  stoelen: SeatAssignment[];
  maxStoelen: number;
  ereLidStoelen?: number[];
  rolstoelPlek?: string[];
  balkon?: boolean;
  [key: number]: SeatAssignment;
}

// Create a new type for array-based rows
type RowArray = SeatAssignment[];

// Update the Row type to handle both formats
type Row = RowArray | RowData;

// Add a new interface to extend the matrix with day information
interface SeatingMatrix extends Array<Row> {
  dayName?: Day;
}

// Add a helper function to safely get seats from a row
function getSeatsFromRow(row: Row): SeatAssignment[] {
  if (Array.isArray(row)) {
    return row;
  }
  return row.stoelen;
}

// Add helper function for row operations
function forEachSeat(row: Row, callback: (seat: SeatAssignment, index: number) => void): void {
  const seats = getSeatsFromRow(row);
  seats.forEach(callback);
}

// Fix isBalconyRow function to directly check zaalIndeling
function isBalconyRow(rowIndex: number): boolean {
  return zaalIndeling.rijen[rowIndex]?.balkon === true;
}

// Update getGroundFloorOccupancy with proper types
function getGroundFloorOccupancy(matrix: Row[]): number {
  const groundFloorRows = matrix.filter((_, idx) => !isBalconyRow(idx));
  const totalSeats = groundFloorRows.reduce((sum, row) => sum + getSeatsFromRow(row).length, 0);
  const occupiedSeats = groundFloorRows.reduce((sum, row) => {
    return sum + getSeatsFromRow(row).filter(seat => seat.guest).length;
  }, 0);
  return (occupiedSeats / totalSeats) * 100;
}

// Function to fetch custom priorities from the database
async function fetchCustomPriorities(): Promise<Row[] | null> {
  const customData = await db.get('priorityMatrix');
  
  return customData ? JSON.parse(customData) : null;
}

// Make the function async to fetch settings
async function generatePriorityMatrix(zaalIndeling: ZaalIndeling): Promise<Row[]> {
  const matrix: Row[] = [];
  const rowKeys = Object.keys(zaalIndeling.rijen).map(Number);

  // Get settings from database
  const settingsStr = await db.get('settings');
  const settings = settingsStr ? JSON.parse(settingsStr) : {};
  const idealRowStart = settings.idealRowStart ?? 4;  // Default to 4 if not set
  const idealRowEnd = settings.idealRowEnd ?? 10;     // Default to 10 if not set

  for (const row of rowKeys) {
    const rowArray: SeatAssignment[] = [];
    const maxSeats = zaalIndeling.rijen[row].maxStoelen;
    const centerColumn = Math.floor(maxSeats / 2);

    // Calculate row priority multiplier based on actual row number (1-based row numbers)
    let rowPriorityMultiplier = 1;
    if (row + 1 >= idealRowStart && row + 1 <= idealRowEnd) {
      rowPriorityMultiplier = 0.5; // Better priority for ideal rows
    }

    // ...rest of the function remains the same...
    for (let col = 0; col < maxSeats; col++) {
      const distanceFromCenter = Math.abs(col - centerColumn);
      const priority = (distanceFromCenter + 1) * rowPriorityMultiplier;
      const seatNumber = col + 1;
      rowArray.push({ stoel: seatNumber, guest: null, priority });
    }
    matrix.push(rowArray);
  }

  return matrix;
}

// Overwrite priority matrix with custom values if available
async function applyCustomPriorities(matrix: Row[]): Promise<Row[]> {
  const customPriorities = await fetchCustomPriorities();

  if (customPriorities) {
    // Iterate through each row in the custom priorities
    Object.entries(customPriorities).forEach(([rowIndexStr, seats]) => {
      const rowIndex = parseInt(rowIndexStr, 10);
      const currentRow = matrix[rowIndex];

      // Check if the row exists in the priority matrix
      if (currentRow) {
        const rowSeats = getSeatsFromRow(currentRow);
        getSeatsFromRow(seats).forEach((seat: { priority: number } | null, seatIndex: number) => {
          if (seat && seat.priority !== null && rowSeats[seatIndex]) {
            // Overwrite priority with custom priority if seat exists in the matrix
            rowSeats[seatIndex].priority = seat.priority;
          }
        });
      }
    });
  }

  return matrix;
}

// New helper function to try assigning seats with a specific priority threshold
async function tryAssignSeats(guest: Guest, matrix: Row[], aantalKaarten: number, maxPriority: number, preferences: SeatingPreference[]): Promise<boolean> {
  // Check if this guest is already seated
  if (isGuestAlreadySeated(matrix, guest.id)) {
    console.log(`Guest ${guest.voornaam} ${guest.achternaam} (ID: ${guest.id}) is already seated. Skipping assignment.`);
    return false;
  }

  const adjustedMaxPriority = getAdjustedPriority(maxPriority, guest);
  
  // Skip preference checking for VIP guests
  if (guest.isErelid || guest.isDocent || guest.speeltMee) {
    return tryNormalSeating(guest, matrix, aantalKaarten, adjustedMaxPriority);
  }
  
  // Check if this guest has a seating preference
  const preference = preferences.find(p => p.guest.id === guest.id || p.preferredGuest.id === guest.id);
  
  if (preference) {
    // Make sure the preferred guest isn't already seated elsewhere
    if (preference.preferredGuest.id !== guest.id && isGuestAlreadySeated(matrix, preference.preferredGuest.id)) {
      const preferredGuestAlreadyWithDesiredGuest = isGuestSeatedNextToGuest(matrix, preference.preferredGuest.id, guest.id);
      if (!preferredGuestAlreadyWithDesiredGuest) {
        // Preferred guest is already seated somewhere else, so just use normal seating
        console.log(`Preferred guest ${preference.preferredGuest.voornaam} is already seated elsewhere. Using normal seating for ${guest.voornaam}.`);
        return tryNormalSeating(guest, matrix, aantalKaarten, adjustedMaxPriority);
      }
    }

    // Try to find seats next to the preferred guest first
    const success = await tryAssignAdjacentSeats(guest, preference, matrix, aantalKaarten, adjustedMaxPriority * 1.5); // Allow worse priority for preferred seating
    if (success) return true;
  }
  
  // If no preference or couldn't satisfy preference, try normal seating
  return tryNormalSeating(guest, matrix, aantalKaarten, adjustedMaxPriority);
}

async function tryNormalAdjacentSeating(
  guest: Guest,
  preference: SeatingPreference,
  matrix: Row[],
  aantalKaarten: number,
  maxPriority: number
): Promise<boolean> {
  const preferredLocation = matrix.findIndex((row, rowIndex) => {
    const seats = getSeatsFromRow(row);
    return seats.some(seat => seat.guest?.id === preference.preferredGuest.id);
  });

  if (preferredLocation !== -1) {
    const seats = getSeatsFromRow(matrix[preferredLocation]);
    const seatIndex = seats.findIndex(seat => seat.guest?.id === preference.preferredGuest.id);
    
    return tryAdjacentSeatingAtLocation(
      guest,
      preference,
      matrix,
      aantalKaarten,
      maxPriority,
      { rowIndex: preferredLocation, seatIndex }
    );
  }

  return false;
}

// Keep only one implementation of tryAssignAdjacentSeats
async function tryAssignAdjacentSeats(
  guest: Guest,
  preference: SeatingPreference,
  matrix: SeatingMatrix,
  aantalKaarten: number,
  maxPriority: number
): Promise<boolean> {
  // Before trying to seat them together, check if this is the correct day for the guest
  if (matrix.dayName) {
    // MODIFIED: Only attempt to seat together if this is FIRST choice day for BOTH guests
    const isGuestFirstDay = guest.voorkeurDag1.toLowerCase() === matrix.dayName.toLowerCase();
    const isPrefGuestFirstDay = preference.preferredGuest.voorkeurDag1.toLowerCase() === matrix.dayName.toLowerCase();
    
    // Only proceed if this is the FIRST choice day for BOTH guests
    if (!isGuestFirstDay || !isPrefGuestFirstDay) {
      console.log(
        `Skipping seating preference for ${guest.voornaam} with ${preference.preferredGuest.voornaam} on day ${matrix.dayName} - first days don't match`,
        `\nGuest first day: ${guest.voorkeurDag1}`,
        `\nPreferred guest first day: ${preference.preferredGuest.voorkeurDag1}`
      );
      return false;
    }
    
    console.log(
      `Attempting to seat ${guest.voornaam} with ${preference.preferredGuest.voornaam} on matching FIRST choice day ${matrix.dayName}`
    );
  }
  
  // Increase priority for mutual preferences
  if (preference.isMutualPreference) {
    maxPriority *= 2;
  }

  // First try normal adjacent seating
  const normalSuccess = await tryNormalAdjacentSeating(guest, preference, matrix, aantalKaarten, maxPriority);
  if (normalSuccess) return true;

  // If that fails, try relocation
  const relocationSuccess = await tryRelocationSeating(guest, preference, matrix, aantalKaarten, maxPriority);
  if (relocationSuccess) return true;

  // If still no success and it's a mutual preference, try even harder by allowing more moves
  if (preference.isMutualPreference) {
    maxPriority *= 1.5; // Allow even worse seats for mutual preferences
    return tryMovingOthersForPriority(guest, preference, matrix, aantalKaarten, maxPriority);
  }

  return false;
}

// Add new helper function to check if a guest is already seated
function isGuestAlreadySeated(matrix: Row[], guestId: number): boolean {
  for (const row of matrix) {
    const seats = getSeatsFromRow(row);
    for (const seat of seats) {
      if (seat.guest && seat.guest.id === guestId) {
        return true;
      }
    }
  }
  return false;
}

// New helper function to check if a guest is seated next to another specific guest
function isGuestSeatedNextToGuest(matrix: Row[], guestId1: number, guestId2: number): boolean {
  for (const row of matrix) {
    const seats = getSeatsFromRow(row);
    for (let i = 0; i < seats.length - 1; i++) {
      if (seats[i].guest?.id === guestId1 && seats[i+1].guest?.id === guestId2) {
        return true;
      }
      if (seats[i].guest?.id === guestId2 && seats[i+1].guest?.id === guestId1) {
        return true;
      }
    }
  }
  return false;
}

// Add new helper function to calculate ideal rows fill percentage
async function getIdealRowsFillPercentage(matrix: Row[], idealRowStart: number, idealRowEnd: number): Promise<number> {
  let totalSeats = 0;
  let occupiedSeats = 0;

  matrix.forEach((row, rowIndex) => {
    const actualRowNumber = rowIndex + 1;
    if (actualRowNumber >= idealRowStart && actualRowNumber <= idealRowEnd) {
      const seats = getSeatsFromRow(row);
      totalSeats += seats.length;
      occupiedSeats += seats.filter(seat => seat.guest !== null).length;
    }
  });

  return totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;
}

function tryAdjacentSeatingAtLocation(
  guest: Guest, 
  preference: SeatingPreference, 
  matrix: Row[], 
  aantalKaarten: number, 
  maxPriority: number,
  location: { rowIndex: number; seatIndex: number }
): boolean {
  // If guest is already seated, don't try to seat them again
  if (isGuestAlreadySeated(matrix, guest.id)) {
    return false;
  }

  const { rowIndex, seatIndex } = location;
  const seats = getSeatsFromRow(matrix[rowIndex]);
  
  // Try both sides of the preferred guest
  const leftSeats = seats.slice(Math.max(0, seatIndex - aantalKaarten), seatIndex);
  const rightSeats = seats.slice(seatIndex + 1, seatIndex + 1 + aantalKaarten);

  const assignIfPossible = (seatsToCheck: SeatAssignment[]): boolean => {
    // STRICTER CHECK: Explicitly verify no blocked seats before proceeding
    const hasBlockedSeats = seatsToCheck.some(seat => seat.blocked);
    if (hasBlockedSeats) {
      console.log(`Cannot seat ${guest.voornaam} adjacent to preferred guest - blocked seats found`);
      return false;
    }
    
    if (seatsToCheck.length === aantalKaarten && seatsToCheck.every(seat => !seat.guest && !seat.blocked)) {
      const avgPriority = seatsToCheck.reduce((sum, seat) => sum + seat.priority, 0) / aantalKaarten;
      if (avgPriority <= maxPriority) {
        // Always mark as together for mutual preferences
        const shouldBeToggled = preference.isMutualPreference;
        
        // Double check for blocked seats one more time before assigning
        if (seatsToCheck.some(seat => seat.blocked)) {
          console.log(`Last minute blocked seat check failed for ${guest.voornaam}`);
          return false;
        }
        
        // Assign seats
        seatsToCheck.forEach(seat => {
          seat.guest = guest;
          seat.together = shouldBeToggled;
        });
        
        // Mark preferred guest's seats as together too
        if (shouldBeToggled) {
          seats.forEach(seat => {
            if (seat.guest?.id === preference.preferredGuest.id) {
              seat.together = true;
            }
          });
        }
        
        console.log(`Successfully seated ${guest.voornaam} adjacent to ${preference.preferredGuest.voornaam} (together: ${shouldBeToggled})`);
        return true;
      }
    }
    return false;
  };

  return assignIfPossible(leftSeats) || assignIfPossible(rightSeats);
}

// Add an enhanced function to verify no blocked seats are in a group
function verifyNoBlockedSeats(matrix: SeatingMatrix, rowIndex: number, startIndex: number, count: number): boolean {
  if (rowIndex < 0 || rowIndex >= matrix.length) return false;
  
  const seats = getSeatsFromRow(matrix[rowIndex]);
  if (startIndex < 0 || startIndex + count > seats.length) return false;
  
  const seatsToCheck = seats.slice(startIndex, startIndex + count);
  return !seatsToCheck.some(seat => seat.blocked);
}

// Add new scoring function
function calculateSeatScore(rowIndex: number, seatIndex: number, totalSeatsInRow: number, settings: AlgorithmSettings, isBalcony: boolean): number {
  const idealRowStart = settings.idealRowStart ?? 3;
  const idealRowEnd = settings.idealRowEnd ?? 6;
  const isIdealRow = rowIndex >= idealRowStart && rowIndex <= idealRowEnd;
  
  // Base score starts at 100
  let score = 100;
  
  // Apply balcony penalty if applicable
  if (isBalcony) {
    score -= settings.balconyPenalty;
  }
  
  // Adjust score based on row position
  if (isIdealRow) {
    score += 50;
    const idealRowCenter = Math.floor((idealRowEnd - idealRowStart) / 2) + idealRowStart;
    const distanceFromIdealCenter = Math.abs(rowIndex - idealRowCenter);
    score -= distanceFromIdealCenter * 5;
  } else {
    const distanceFromIdealSection = Math.min(
      Math.abs(rowIndex - idealRowStart),
      Math.abs(rowIndex - idealRowEnd)
    );
    score -= distanceFromIdealSection * 10;
  }
  
  // Apply center seating preference if enabled
  if (settings.preferCenterSeats) {
    const centerSeat = Math.floor(totalSeatsInRow / 2);
    const distanceFromCenter = Math.abs(seatIndex - centerSeat);
    score -= distanceFromCenter * 5;
  }
  
  return Math.max(0, score); // Ensure score doesn't go negative
}

// Fix the threshold setting default
 // Lower the threshold to make balcony more accessible

// Add this helper function to calculate center-aligned start position
function calculateCenteredStartPosition(rowLength: number, numSeats: number): number {
  const rowCenter = Math.floor(rowLength / 2);
  const groupCenter = Math.floor(numSeats / 2);
  // This will center the group in the row
  return rowCenter - groupCenter;
}

// Add this helper function to calculate the ideal starting position for centered group seating
function calculateGroupStartPosition(rowLength: number, groupSize: number): number {
  const rowCenter = Math.floor(rowLength / 2);
  const groupCenter = Math.floor(groupSize / 2);
  return rowCenter - groupCenter;
}

// Modify tryNormalSeating function to allow VIPs on balcony when needed
async function tryNormalSeating(guest: Guest, matrix: Row[], aantalKaarten: number, maxPriority: number): Promise<boolean> {
  try {
    const settingsStr = await db.get('settings');
    const settings: AlgorithmSettings = settingsStr ? JSON.parse(settingsStr) : {
      idealRowStart: 3,
      idealRowEnd: 6,
      useBalconyThreshold: 70,
      maxVIPRowDeviation: 2,
      preferCenterSeats: true,
      prioritizePreferences: true,
      maxMovesForPreference: 3,
      balconyPenalty: 20
    };

    // Get ground floor occupancy
    const groundFloorOccupancy = getGroundFloorOccupancy(matrix);
    console.log('Ground floor occupancy:', groundFloorOccupancy, '%, threshold:', settings.useBalconyThreshold);

    // Allow balcony seating if:
    // 1. Ground floor is sufficiently full OR
    // 2. There are no suitable ground floor seats available
    const shouldTryBalcony = groundFloorOccupancy >= settings.useBalconyThreshold;

    // Collect all possible seating options
    const groundFloorOptions: SeatOption[] = [];
    const balconyOptions: SeatOption[] = [];

    matrix.forEach((row, rowIndex) => {
      const seats = getSeatsFromRow(row);
      const isBalconyForRow = isBalconyRow(rowIndex);

      // Instead of skipping balcony for VIPs entirely, collect the options but with higher penalty
      // We'll use them only if necessary
      const isVip = guest.isErelid || guest.isDocent || guest.speeltMee;

      // Calculate the exact center position for this group
      const centerStartIndex = calculateCenteredStartPosition(seats.length, aantalKaarten);
      
      // Only try the centered position first
      const centerSeats = seats.slice(centerStartIndex, centerStartIndex + aantalKaarten);
      if (centerSeats.length === aantalKaarten && centerSeats.every(seat => !seat.guest && !seat.blocked)) {
        // Apply extra balcony penalty for VIPs
        const vipBalconyPenalty = isVip && isBalconyForRow ? settings.balconyPenalty * 2 : 0;
        const score = calculateSeatScore(rowIndex, centerStartIndex, seats.length, settings, isBalconyForRow) - vipBalconyPenalty;
        
        const option = {
          rowIndex,
          seatIndex: centerStartIndex,
          score,
          isBalcony: isBalconyForRow
        };

        if (isBalconyForRow) {
          balconyOptions.push(option);
        } else {
          groundFloorOptions.push(option);
        }
      }

      // If center position is not available, try positions progressively further from center
      for (let offset = 1; offset <= Math.floor(seats.length / 2) - Math.floor(aantalKaarten / 2); offset++) {
        // Try left of center
        const leftIndex = centerStartIndex - offset;
        // Try right of center
        const rightIndex = centerStartIndex + offset;

        if (leftIndex >= 0) {
          const leftSeats = seats.slice(leftIndex, leftIndex + aantalKaarten);
          if (leftSeats.length === aantalKaarten && leftSeats.every(seat => !seat.guest && !seat.blocked)) {
            // Apply extra balcony penalty for VIPs
            const vipBalconyPenalty = isVip && isBalconyForRow ? settings.balconyPenalty * 2 : 0;
            const score = calculateSeatScore(rowIndex, leftIndex, seats.length, settings, isBalconyForRow) - 
                          (offset * 10) - vipBalconyPenalty; // Penalty for being off-center plus VIP balcony penalty
            
            const option = {
              rowIndex,
              seatIndex: leftIndex,
              score,
              isBalcony: isBalconyForRow
            };

            if (isBalconyForRow) {
              balconyOptions.push(option);
            } else {
              groundFloorOptions.push(option);
            }
          }
        }

        if (rightIndex + aantalKaarten <= seats.length) {
          const rightSeats = seats.slice(rightIndex, rightIndex + aantalKaarten);
          if (rightSeats.length === aantalKaarten && rightSeats.every(seat => !seat.guest && !seat.blocked)) {
            // Apply extra balcony penalty for VIPs
            const vipBalconyPenalty = isVip && isBalconyForRow ? settings.balconyPenalty * 2 : 0;
            const score = calculateSeatScore(rowIndex, rightIndex, seats.length, settings, isBalconyForRow) - 
                          (offset * 10) - vipBalconyPenalty; // Penalty for being off-center plus VIP balcony penalty
            
            const option = {
              rowIndex,
              seatIndex: rightIndex,
              score,
              isBalcony: isBalconyForRow
            };

            if (isBalconyForRow) {
              balconyOptions.push(option);
            } else {
              groundFloorOptions.push(option);
            }
          }
        }
      }
    });

    // Sort options by score
    groundFloorOptions.sort((a, b) => b.score - a.score);
    balconyOptions.sort((a, b) => b.score - a.score);

    // Try to assign seats in order of preference
    let options = groundFloorOptions;
    
    // If ground floor is sufficiently full or no ground floor options available,
    // include balcony options
    if (shouldTryBalcony || groundFloorOptions.length === 0) {
      console.log('Including balcony options for guest:', guest.voornaam, guest.achternaam);
      options = [...groundFloorOptions, ...balconyOptions];
    }

    // Try each option until we find a suitable spot
    for (const option of options) {
      const row = matrix[option.rowIndex];
      const seats = getSeatsFromRow(row);
      const consecutiveSeats = seats.slice(option.seatIndex, option.seatIndex + aantalKaarten);
      
      // STRICT CHECK: Skip immediately if any seat is blocked
      if (consecutiveSeats.some(seat => seat.blocked)) {
        console.log(`Skipping blocked seats for ${guest.voornaam} in row ${option.rowIndex + 1}`);
        continue; // Skip this option if any seat is blocked
      }
      
      if (consecutiveSeats.every(seat => !seat.guest)) {
        // Assign seats without together flag by default
        consecutiveSeats.forEach((_, index) => {
          seats[option.seatIndex + index].guest = guest;
          seats[option.seatIndex + index].together = false; // Reset together flag
        });
        
        const isVip = guest.isErelid || guest.isDocent || guest.speeltMee;
        if (isVip && option.isBalcony) {
          console.log(`VIP ${guest.voornaam} assigned to balcony row ${option.rowIndex + 1} (less preferable but keeping preferred day)`);
        } else {
          console.log(`Assigned ${guest.voornaam} to ${option.isBalcony ? 'balcony' : 'ground floor'} row ${option.rowIndex + 1}`);
        }
        return true;
      }
    }

    console.log(`Could not find seats for ${guest.voornaam} (Ground floor: ${groundFloorOptions.length}, Balcony: ${balconyOptions.length})`);
    return false;
  } catch (error) {
    console.error('Error in tryNormalSeating:', error);
    return false;
  }
}

async function tryAssignToRow(row: Row, guest: Guest, aantalKaarten: number, maxPriority: number): Promise<boolean> {
  const seats = getSeatsFromRow(row);
  for (let seatIndex = 0; seatIndex <= seats.length - aantalKaarten; seatIndex++) {
    const consecutiveSeats = seats.slice(seatIndex, seatIndex + aantalKaarten);
    
    if (consecutiveSeats.length === aantalKaarten && 
        consecutiveSeats.every(seat => seat && !seat.guest)) {
      
      const avgPriority = consecutiveSeats.reduce((sum, seat) => 
        sum + (typeof seat.priority === 'number' ? seat.priority : 1), 0) / aantalKaarten;
      
      if (avgPriority <= maxPriority) {
        // Only set together flag if multiple seats AND they're consecutive
        const shouldBeToggled = aantalKaarten > 1;
        
        // Assign seats
        for (let i = 0; i < aantalKaarten; i++) {
          const actualSeat = seats[seatIndex + i];
          if (actualSeat) {
            actualSeat.guest = guest;
            actualSeat.together = false; // Only set true when actually next to preferred guest
          }
        }
        
       
        return true;
      }
    }
  }
  return false;
}

// New helper functions
function getAdjustedPriority(basePriority: number, guest: Guest): number {
  if (guest.isErelid) return basePriority * 0.5;  // Ereleden get best priority (0.5)
  if (guest.speeltMee) return basePriority * 0.7; // Spelers get second priority (0.7)
  if (guest.isDocent) return basePriority * 0.8;  // Docenten get third priority (0.8)
 
  return basePriority;
}

// Add helper function to check if guests share preferred days
function sharePreferredDay(guest1: Guest, guest2: Guest): boolean {
  // Make this consistent for all guest types
  const guest1Days = [
    guest1.voorkeurDag1.toLowerCase(), 
    guest1.voorkeurDag2.toLowerCase()
  ].filter(Boolean); // Remove empty strings
  
  const guest2Days = [
    guest2.voorkeurDag1.toLowerCase(), 
    guest2.voorkeurDag2.toLowerCase()
  ].filter(Boolean);
  
  // Give priority to first preference day matches
  if (guest1.voorkeurDag1.toLowerCase() === guest2.voorkeurDag1.toLowerCase()) {
    return true;
  }
  
  // Otherwise check if they share any day
  return guest1Days.some(day => guest2Days.includes(day));
}

// Update findPreferredSeating to handle bi-directional preferences
async function findPreferredSeating(guests: Guest[]): Promise<SeatingPreference[]> {
  const preferences: SeatingPreference[] = [];
  const allGuests: Guest[] = await getGuests();

  // Get settings
  const settingsStr = await db.get('settings');
  const settings: AlgorithmSettings = settingsStr ? JSON.parse(settingsStr) : {
    allowRegularToVIPPreference: false, // Default to not allowing regular guests to select VIPs
    requireMutualPreference: false // Default to not requiring mutual preference
  };

  // Create a map for faster lookups
  const guestMap = new Map<string, Guest>();
  allGuests.forEach(g => {
    if (g.leerlingnummer) {
      guestMap.set(g.leerlingnummer.toString(), g);
    }
  });

  // Process each guest's preferences - only skip ereleden
  guests.forEach(guest => {
    if (guest.isErelid) {
      console.log(`Skipping preference for erelid: ${guest.voornaam} (${guest.leerlingnummer})`);
      return;
    }
    
    if (guest.voorkeurPersoonen && guest.leerlingnummer) {
      // Prevent self-preferences
      if (guest.voorkeurPersoonen === guest.leerlingnummer.toString()) {
        console.log(`Skipping self-preference for ${guest.voornaam} (${guest.leerlingnummer})`);
        return;
      }
      
      const preferredGuest = guestMap.get(guest.voorkeurPersoonen);
      
      if (preferredGuest) {
        // Only skip if preferred guest is erelid and not allowed
        if (preferredGuest.isErelid && !settings.allowRegularToVIPPreference && !guest.isErelid) {
          console.log(`Skipping preference as regular guest selected erelid: ${preferredGuest.voornaam}`);
          return;
        }

        // Check if they share at least one preferred day
        if (!sharePreferredDay(guest, preferredGuest)) {
          console.log(`Skipping preference for ${guest.voornaam} and ${preferredGuest.voornaam} - no shared preferred days`);
          return;
        }
        
        // Check mutual preference requirement
        if (settings.requireMutualPreference && preferredGuest.voorkeurPersoonen !== guest.leerlingnummer.toString()) {
          console.log(`Skipping preference for ${guest.voornaam} and ${preferredGuest.voornaam} - mutual preference required but not found`);
          return;
        }

        // Add the original preference
        preferences.push({
          guest,
          preferredGuest,
          isMutualPreference: preferredGuest.voorkeurPersoonen === guest.leerlingnummer.toString()
        });

        // Add the reverse preference only if they share preferred days
        if (preferredGuest.voorkeurPersoonen === guest.leerlingnummer.toString()) {
          preferences.push({
            guest: preferredGuest,
            preferredGuest: guest,
            isMutualPreference: true
          });
        }

        console.log(`Preference found (shared days): ${guest.voornaam} (${guest.leerlingnummer}) -> ${preferredGuest.voornaam} (${preferredGuest.leerlingnummer})`);
      } else {
        console.log(`Could not find preferred guest with leerlingnummer ${guest.voorkeurPersoonen} for guest ${guest.voornaam} (${guest.leerlingnummer})`);
      }
    }
  });

  // Remove duplicates (in case both guests prefer each other)
  const uniquePreferences = preferences.filter((pref, index) => {
    const firstOccurrence = preferences.findIndex(p => 
      (p.guest.id === pref.guest.id && p.preferredGuest.id === pref.preferredGuest.id) ||
      (p.guest.id === pref.preferredGuest.id && p.preferredGuest.id === p.guest.id)
    );
    return index === firstOccurrence;
  });

  console.log(`Found ${uniquePreferences.length} seating preferences`);
  return uniquePreferences;
}

// Add new helper function to adjust priority based on day preference
function getAdjustedThresholdForDay(guest: Guest, day: Day, baseThreshold: number): number {
  // Check if this is the guest's first preference day
  const isFirstPreference = guest.voorkeurDag1.toLowerCase() === day;
  const isSecondPreference = guest.voorkeurDag2.toLowerCase() === day;
  
  // Apply strong priority boost for first preference day, especially for performers
  if (isFirstPreference) {
    // Much stronger preference for performers, especially on their first choice
    if (guest.speeltMee) {
      return baseThreshold * 0.3; // 70% lower threshold for performers on first choice day
    }
    return baseThreshold * 0.6; // 40% lower threshold for regular guests on first choice day
  }
  
  // Apply penalty for second preference day
  if (isSecondPreference) {
    if (guest.speeltMee) {
      return baseThreshold * 2.0; // Higher threshold for performers on second choice
    }
    return baseThreshold * 1.5; // Higher threshold for regular guests on second choice
  }
  
  // Apply severe penalty for any other day - this should be higher than balcony penalty
  if (guest.speeltMee) {
    return baseThreshold * 5.0; // 5x threshold for performers on non-preferred days (higher than balcony penalty)
  }
  return baseThreshold * 4.0; // 4x threshold for regular guests on non-preferred days (higher than balcony penalty)
}

// Update autoAssignSeating to prioritize guests with preferences first
export async function autoAssignSeating(guests: Guest[]): Promise<void> {
  let placedCount = 0;
  let unplacedCount = 0;
  const seatedGuestIds = new Set<number>(); // Track seated guests by ID
  
  try {
    // Log start of algorithm
    await logAlgorithm({
      type: 'info',
      message: 'Algoritme gestart voor zitplaats toewijzing',
      phase: 'initialization',
      timestamp: new Date().toISOString()
    });

    const dayAssignments = await getDayAssignments();
    const daysToProcess: Day[] = ['woensdag', 'donderdag', 'vrijdag'];
    
    // Reset seating for all days
    const daysToReset = ['woensdag', 'donderdag', 'vrijdag'] as Day[];
    for (const day of daysToReset) {
      const matrix = await generatePriorityMatrix(zaalIndeling); // Wait for matrix generation
      
      // Get blocked seats for this day and mark them in the matrix
      const blockedSeats = await getBlockedSeats(day);
      
      // Mark blocked seats in the matrix
      for (const blockedSeat of blockedSeats) {
        // Row and seat are 1-indexed in UI but 0-indexed in matrix
        const rowIndex = blockedSeat.row - 1;
        const seatIndex = blockedSeat.seatNumber - 1;
        
        if (matrix[rowIndex] && Array.isArray(getSeatsFromRow(matrix[rowIndex]))) {
          const seats = getSeatsFromRow(matrix[rowIndex]);
          if (seats[seatIndex]) {
            // Mark seat as blocked by adding a special property
            seats[seatIndex].blocked = true;
            seats[seatIndex].reason = blockedSeat.reason || 'Blocked';
          }
        }
      }
      
      await setSeatsForDay(day, matrix);
      dayAssignments[day] = { 
        assigned: 0, 
        capacity: TOTAL_CAPACITY,
        seats: [] 
      };
    }

    // Find all seating preferences for later use
    const allPreferences = await findPreferredSeating(guests);
    await logAlgorithm({
      type: 'info',
      message: `Found ${allPreferences.length} seating preferences`,
      phase: 'initialization',
      timestamp: new Date().toISOString()
    });

    // Create a map to easily check if a guest has preferences
    const guestsWithPreferences = new Set<number>();
    allPreferences.forEach(pref => {
      guestsWithPreferences.add(pref.guest.id);
    });

    // Split guests into categories and sort by registration date (earliest first)
    const ereleden = guests.filter(g => g.isErelid)
      .sort((a, b) => a.datumAanmelding - b.datumAanmelding);
    
    const spelers = guests.filter(g => g.speeltMee && !g.isErelid)
      .sort((a, b) => a.datumAanmelding - b.datumAanmelding);
    
    const docenten = guests.filter(g => g.isDocent && !g.isErelid && !g.speeltMee)
      .sort((a, b) => a.datumAanmelding - b.datumAanmelding);
    
    const regularGuests = guests.filter(g => !g.isErelid && !g.isDocent && !g.speeltMee)
      .sort((a, b) => a.datumAanmelding - b.datumAanmelding);

    // Further split each category by preference (preserving the date sorting)
    const ereledenWithPrefs = ereleden.filter(g => guestsWithPreferences.has(g.id) || g.voorkeurPersoonen);
    const ereledenWithoutPrefs = ereleden.filter(g => !guestsWithPreferences.has(g.id) && !g.voorkeurPersoonen);
    
    const spelersWithPrefs = spelers.filter(g => guestsWithPreferences.has(g.id) || g.voorkeurPersoonen);
    const spelersWithoutPrefs = spelers.filter(g => !guestsWithPreferences.has(g.id) && !g.voorkeurPersoonen);
    
    const docentenWithPrefs = docenten.filter(g => guestsWithPreferences.has(g.id) || g.voorkeurEmail);
    const docentenWithoutPrefs = docenten.filter(g => !guestsWithPreferences.has(g.id) && !g.voorkeurEmail);
    
    const regularWithPrefs = regularGuests.filter(g => guestsWithPreferences.has(g.id) || g.voorkeurPersoonen);
    const regularWithoutPrefs = regularGuests.filter(g => !guestsWithPreferences.has(g.id) && !g.voorkeurPersoonen);

    // Log the distribution of guests
    await logAlgorithm({
      type: 'info',
      message: 'Guest distribution by category and preferences',
      phase: 'initialization',
      timestamp: new Date().toISOString(),
      details: {
        ereleden: { total: ereleden.length, withPrefs: ereledenWithPrefs.length, withoutPrefs: ereledenWithoutPrefs.length },
        spelers: { total: spelers.length, withPrefs: spelersWithPrefs.length, withoutPrefs: spelersWithoutPrefs.length },
        docenten: { total: docenten.length, withPrefs: docentenWithPrefs.length, withoutPrefs: docentenWithoutPrefs.length },
        regular: { total: regularGuests.length, withPrefs: regularWithPrefs.length, withoutPrefs: regularWithoutPrefs.length }
      }
    });

    // Add log for date-based sorting
    await logAlgorithm({
      type: 'info',
      message: 'Guests sorted by registration date (earlier registrations prioritized)',
      phase: 'initialization',
      timestamp: new Date().toISOString()
    });

    // 1. Place Ereleden with preferences first
    await logAlgorithm({ type: 'info', message: 'Starting placement of Ereleden with preferences', phase: 'seating', timestamp: new Date().toISOString() });
    for (const erelid of ereledenWithPrefs) {
      if (seatedGuestIds.has(erelid.id)) {
        console.log(`Erelid ${erelid.voornaam} ${erelid.achternaam} (ID: ${erelid.id}) already seated. Skipping.`);
        continue;
      }
      
      const preferences = allPreferences.filter(p => p.guest.id === erelid.id);
      const day1 = erelid.voorkeurDag1.toLowerCase() as Day;
      
      if (await tryAssignGuestToDay(erelid, day1, preferences, dayAssignments)) {
        seatedGuestIds.add(erelid.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Erelid with preferences: ${erelid.voornaam} ${erelid.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = erelid.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(erelid, day2, preferences, dayAssignments)) {
        seatedGuestIds.add(erelid.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Erelid with preferences: ${erelid.voornaam} ${erelid.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Erelid with preferences: ${erelid.voornaam} ${erelid.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 2. Place Ereleden without preferences
    await logAlgorithm({ type: 'info', message: 'Starting placement of Ereleden without preferences', phase: 'seating', timestamp: new Date().toISOString() });
    for (const erelid of ereledenWithoutPrefs) {
      if (seatedGuestIds.has(erelid.id)) {
        console.log(`Erelid ${erelid.voornaam} ${erelid.achternaam} (ID: ${erelid.id}) already seated. Skipping.`);
        continue;
      }
      
      const day1 = erelid.voorkeurDag1.toLowerCase() as Day;
      
      if (await tryAssignGuestToDay(erelid, day1, [], dayAssignments)) {
        seatedGuestIds.add(erelid.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Erelid: ${erelid.voornaam} ${erelid.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = erelid.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(erelid, day2, [], dayAssignments)) {
        seatedGuestIds.add(erelid.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Erelid: ${erelid.voornaam} ${erelid.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Erelid: ${erelid.voornaam} ${erelid.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 3. Place Spelers with preferences
    await logAlgorithm({ type: 'info', message: 'Starting placement of Performers with preferences', phase: 'seating', timestamp: new Date().toISOString() });
    for (const speler of spelersWithPrefs) {
      if (seatedGuestIds.has(speler.id)) {
        console.log(`Performer ${speler.voornaam} ${speler.achternaam} (ID: ${speler.id}) already seated. Skipping.`);
        continue;
      }
      
      const preferences = allPreferences.filter(p => p.guest.id === speler.id);
      
      // ONLY place on Friday if it's actually their first preference
      if (speler.voorkeurDag1.toLowerCase() === 'vrijdag') {
        console.log(`Trying to place performer ${speler.voornaam} on their first preference day: Friday`);
        if (await tryAssignGuestToDay(speler, 'vrijdag', preferences, dayAssignments)) {
          seatedGuestIds.add(speler.id); // Mark as seated
          await logAlgorithm({ 
            type: 'success', 
            message: `Placed Performer with preferences: ${speler.voornaam} ${speler.achternaam} on their first preference day (Friday)`, 
            phase: 'seating', 
            timestamp: new Date().toISOString() 
          });
          placedCount++;
          continue;
        }
      } else {
        // Try the guest's actual first preference day
        const day1 = speler.voorkeurDag1.toLowerCase() as Day;
        console.log(`Trying to place performer ${speler.voornaam} on their first preference day: ${day1}`);
        if (await tryAssignGuestToDay(speler, day1, preferences, dayAssignments)) {
          seatedGuestIds.add(speler.id); // Mark as seated
          await logAlgorithm({ 
            type: 'success', 
            message: `Placed Performer with preferences: ${speler.voornaam} ${speler.achternaam} on ${day1}`, 
            phase: 'seating', 
            timestamp: new Date().toISOString() 
          });
          placedCount++;
          continue;
        }
      }
      
      const day2 = speler.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(speler, day2, preferences, dayAssignments)) {
        seatedGuestIds.add(speler.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Performer with preferences: ${speler.voornaam} ${speler.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Performer with preferences: ${speler.voornaam} ${speler.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 4. Place Spelers without preferences
    await logAlgorithm({ type: 'info', message: 'Starting placement of Performers without preferences', phase: 'seating', timestamp: new Date().toISOString() });
    for (const speler of spelersWithoutPrefs) {
      if (seatedGuestIds.has(speler.id)) {
        console.log(`Performer ${speler.voornaam} ${speler.achternaam} (ID: ${speler.id}) already seated. Skipping.`);
        continue;
      }
      
      // Special case for performers who prefer Friday
      if (speler.voorkeurDag1.toLowerCase() === 'vrijdag') {
        if (await tryAssignGuestToDay(speler, 'vrijdag', [], dayAssignments)) {
          seatedGuestIds.add(speler.id); // Mark as seated
          await logAlgorithm({ 
            type: 'success', 
            message: `Placed Performer: ${speler.voornaam} ${speler.achternaam} on Friday`, 
            phase: 'seating', 
            timestamp: new Date().toISOString() 
          });
          placedCount++;
          continue;
        }
      }
      
      const day1 = speler.voorkeurDag1.toLowerCase() as Day;
      if (await tryAssignGuestToDay(speler, day1, [], dayAssignments)) {
        seatedGuestIds.add(speler.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Performer: ${speler.voornaam} ${speler.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = speler.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(speler, day2, [], dayAssignments)) {
        seatedGuestIds.add(speler.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Performer: ${speler.voornaam} ${speler.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Performer: ${speler.voornaam} ${speler.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 5. Place Teachers with preferences (includes mutual preferences)
    await logAlgorithm({ type: 'info', message: 'Starting placement of Teachers with preferences', phase: 'seating', timestamp: new Date().toISOString() });
    
    // 5a. First handle teacher pairs (mutual preferences)
    const teacherPreferences = await findTeacherPreferences(docenten);
    const mutualTeacherPairs = teacherPreferences
      .filter(p => p.isMutualPreference)
      .reduce((pairs: {guest1: Guest, guest2: Guest}[], pref) => {
        // Skip self-pairs (same teacher on both sides)
        if (pref.guest.id === pref.preferredGuest.id) {
          console.log(`Skipping self-preference for teacher: ${pref.guest.voornaam} ${pref.guest.achternaam}`);
          return pairs;
        }
        
        // Only add each pair once
        const existingPair = pairs.find(p => 
          (p.guest1.id === pref.guest.id && p.guest2.id === pref.preferredGuest.id) ||
          (p.guest2.id === pref.guest.id && p.guest1.id === pref.preferredGuest.id)
        );
        if (!existingPair) {
          pairs.push({
            guest1: pref.guest,
            guest2: pref.preferredGuest
          });
        }
        return pairs;
      }, []);

    // Track which teachers have been assigned
    const assignedTeachers = new Set<number>();

    // Place teacher pairs
    for (const pair of mutualTeacherPairs) {
      const { guest1, guest2 } = pair;
      
      // Skip if either teacher is already assigned
      if (seatedGuestIds.has(guest1.id) || seatedGuestIds.has(guest2.id)) {
        console.log(`Skipping teacher pair (${guest1.voornaam}, ${guest2.voornaam}) as one or both are already seated`);
        // Mark as assigned if they're already seated to prevent further processing
        if (seatedGuestIds.has(guest1.id)) assignedTeachers.add(guest1.id);
        if (seatedGuestIds.has(guest2.id)) assignedTeachers.add(guest2.id);
        continue;
      }
      
      // Try to place them on a shared preferred day, prioritizing first preference days
      const firstPrefSharedDays = daysToProcess.filter(day => 
        guest1.voorkeurDag1.toLowerCase() === day && 
        (guest2.voorkeurDag1.toLowerCase() === day || guest2.voorkeurDag2.toLowerCase() === day)
      );
      
      // Try first preference days first
      let success = false;
      for (const day of firstPrefSharedDays) {
        console.log(`Trying to seat teacher pair on shared FIRST preference day: ${day}`);
        if (await tryAssignTeacherPair(guest1, guest2, day, dayAssignments)) {
          await logAlgorithm({ 
            type: 'success', 
            message: `Placed Teacher Pair: ${guest1.voornaam} ${guest1.achternaam} and ${guest2.voornaam} ${guest2.achternaam} on shared FIRST preference day ${day}`, 
            phase: 'seating', 
            timestamp: new Date().toISOString() 
          });
          seatedGuestIds.add(guest1.id);
          seatedGuestIds.add(guest2.id);
          assignedTeachers.add(guest1.id);
          assignedTeachers.add(guest2.id);
          placedCount += 2;
          success = true;
          break;
        }
      }
      
      // If first preference didn't work, try any shared day
      if (!success) {
        const anySharedDays = daysToProcess.filter(day => 
          (guest1.voorkeurDag1.toLowerCase() === day || guest1.voorkeurDag2.toLowerCase() === day) &&
          (guest2.voorkeurDag1.toLowerCase() === day || guest2.voorkeurDag2.toLowerCase() === day)
        ).filter(day => !firstPrefSharedDays.includes(day)); // Exclude already tried days
        
        for (const day of anySharedDays) {
          console.log(`Trying to seat teacher pair on shared preference day: ${day}`);
          if (await tryAssignTeacherPair(guest1, guest2, day, dayAssignments)) {
            await logAlgorithm({ 
              type: 'success', 
              message: `Placed Teacher Pair: ${guest1.voornaam} ${guest1.achternaam} and ${guest2.voornaam} ${guest2.achternaam} on shared preference day ${day}`, 
              phase: 'seating', 
              timestamp: new Date().toISOString() 
            });
            seatedGuestIds.add(guest1.id);
            seatedGuestIds.add(guest2.id);
            assignedTeachers.add(guest1.id);
            assignedTeachers.add(guest2.id);
            placedCount += 2;
            success = true;
            break;
          }
        }
      }
      
      if (!success) {
        await logAlgorithm({ 
          type: 'warning', 
          message: `Could not place Teacher Pair: ${guest1.voornaam} ${guest1.achternaam} and ${guest2.voornaam} ${guest2.achternaam} on shared days`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
      }
    }

    // 5b. Then handle individual teachers with preferences (that haven't already been placed in pairs)
    const remainingTeachersWithPrefs = docentenWithPrefs.filter(d => !assignedTeachers.has(d.id));
    for (const teacher of remainingTeachersWithPrefs) {
      if (seatedGuestIds.has(teacher.id)) {
        console.log(`Teacher ${teacher.voornaam} ${teacher.achternaam} (ID: ${teacher.id}) already seated. Skipping.`);
        continue;
      }
      
      const preferences = allPreferences.filter(p => p.guest.id === teacher.id);
      
      const day1 = teacher.voorkeurDag1.toLowerCase() as Day;
      if (await tryAssignGuestToDay(teacher, day1, preferences, dayAssignments)) {
        seatedGuestIds.add(teacher.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Teacher with preferences: ${teacher.voornaam} ${teacher.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = teacher.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(teacher, day2, preferences, dayAssignments)) {
        seatedGuestIds.add(teacher.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Teacher with preferences: ${teacher.voornaam} ${teacher.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Teacher with preferences: ${teacher.voornaam} ${teacher.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 6. Place remaining Teachers without preferences
    await logAlgorithm({ type: 'info', message: 'Starting placement of Teachers without preferences', phase: 'seating', timestamp: new Date().toISOString() });
    const remainingTeachersWithoutPrefs = docentenWithoutPrefs.filter(d => !assignedTeachers.has(d.id));
    for (const teacher of remainingTeachersWithoutPrefs) {
      if (seatedGuestIds.has(teacher.id)) {
        console.log(`Teacher ${teacher.voornaam} ${teacher.achternaam} (ID: ${teacher.id}) already seated. Skipping.`);
        continue;
      }
      
      const day1 = teacher.voorkeurDag1.toLowerCase() as Day;
      if (await tryAssignGuestToDay(teacher, day1, [], dayAssignments)) {
        seatedGuestIds.add(teacher.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Teacher: ${teacher.voornaam} ${teacher.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = teacher.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(teacher, day2, [], dayAssignments)) {
        seatedGuestIds.add(teacher.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Teacher: ${teacher.voornaam} ${teacher.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Teacher: ${teacher.voornaam} ${teacher.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 7. Place Regular guests with preferences
    await logAlgorithm({ type: 'info', message: 'Starting placement of Regular guests with preferences', phase: 'seating', timestamp: new Date().toISOString() });
    for (const guest of regularWithPrefs) {
      if (seatedGuestIds.has(guest.id)) {
        console.log(`Regular guest ${guest.voornaam} ${guest.achternaam} (ID: ${guest.id}) already seated. Skipping.`);
        continue;
      }
      
      const preferences = allPreferences.filter(p => p.guest.id === guest.id);
      
      const day1 = guest.voorkeurDag1.toLowerCase() as Day;
      if (await tryAssignGuestToDay(guest, day1, preferences, dayAssignments)) {
        seatedGuestIds.add(guest.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Regular guest with preferences: ${guest.voornaam} ${guest.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = guest.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(guest, day2, preferences, dayAssignments)) {
        seatedGuestIds.add(guest.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Regular guest with preferences: ${guest.voornaam} ${guest.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Regular guest with preferences: ${guest.voornaam} ${guest.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
    }

    // 8. Place remaining Regular guests without preferences
    await logAlgorithm({ type: 'info', message: 'Starting placement of Regular guests without preferences', phase: 'seating', timestamp: new Date().toISOString() });
    for (const guest of regularWithoutPrefs) {
      if (seatedGuestIds.has(guest.id)) {
        console.log(`Regular guest ${guest.voornaam} ${guest.achternaam} (ID: ${guest.id}) already seated. Skipping.`);
        continue;
      }
      
      const day1 = guest.voorkeurDag1.toLowerCase() as Day;
      if (await tryAssignGuestToDay(guest, day1, [], dayAssignments)) {
        seatedGuestIds.add(guest.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Regular guest: ${guest.voornaam} ${guest.achternaam} on ${day1}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      const day2 = guest.voorkeurDag2.toLowerCase() as Day;
      if (await tryAssignGuestToDay(guest, day2, [], dayAssignments)) {
        seatedGuestIds.add(guest.id); // Mark as seated
        await logAlgorithm({ 
          type: 'success', 
          message: `Placed Regular guest: ${guest.voornaam} ${guest.achternaam} on ${day2}`, 
          phase: 'seating', 
          timestamp: new Date().toISOString() 
        });
        placedCount++;
        continue;
      }
      
      await logAlgorithm({ 
        type: 'warning', 
        message: `Could not place Regular guest: ${guest.voornaam} ${guest.achternaam} on preferred days`, 
        phase: 'seating', 
        timestamp: new Date().toISOString() 
      });
      unplacedCount++;
    }

    await updateDayAssignments(dayAssignments);

    // Add verification logging
    logGuestDayAssignments(dayAssignments, guests);

    // Log completion
    await logAlgorithm({
      type: 'success',
      message: 'Zitplaats toewijzing volledig afgerond',
      phase: 'optimization',
      timestamp: new Date().toISOString(),
      details: {
        totalGuests: guests.length,
        totalPlaced: placedCount,
        totalUnplaced: unplacedCount
      }
    });
  } catch (error) {
    if (error instanceof SeatingError) {
      throw error; // Re-throw our custom errors
    }
    // For unexpected errors
    await logAlgorithm({
      type: 'error',
      message: `Algoritme fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
      phase: 'initialization',
      timestamp: new Date().toISOString(),
      details: { stack: error instanceof Error ? error.stack : 'No stack available' }
    });
    throw new SeatingError(
      'Er is een onverwachte fout opgetreden tijdens het toewijzen van stoelen',
      'UNKNOWN_ERROR',
      'error',
      'Probeer de applicatie opnieuw op te starten of neem contact op met de beheerder'
    );
  }
}

// Add new function to handle teacher pairs
async function tryAssignTeacherPair(
  teacher1: Guest,
  teacher2: Guest,
  day: Day,
  dayAssignments: DaySeating
): Promise<boolean> {
  // First check if this is a valid pairing (not the same teacher)
  if (!isValidTeacherPair(teacher1, teacher2)) {
    return false;
  }

  // Check if either teacher is already seated
  if (dayAssignments[day]?.seats?.some(assignment => 
      assignment.guestId === teacher1.id || assignment.guestId === teacher2.id)) {
    console.log(`Cannot assign teacher pair: one or both teachers already seated on ${day}`);
    return false;
  }

  const seating = await getSeatsForDay(day);
  const totalSeats = parseInt(teacher1.aantalKaarten) + parseInt(teacher2.aantalKaarten);
  
  const settingsStr = await db.get('settings');
  const settings = settingsStr ? JSON.parse(settingsStr) : {
    idealRowStart: 3,
    idealRowEnd: 6,
    maxVIPRowDeviation: 2,
  };

  // Check capacity
  const currentDay = dayAssignments[day];
  if (!currentDay || (currentDay.assigned + totalSeats > currentDay.capacity)) {
    return false;
  }

  // Define ideal rows first (changed to give later rows for teachers)
  const idealRows = Array.from(
    { length: settings.idealRowEnd - settings.idealRowStart + 1 },
    (_, i) => settings.idealRowStart + i + 2 // Add offset to push teachers back by 2 rows
  );

  // Sort rows from back to front for teachers
  const centerRow = Math.floor((settings.idealRowEnd + settings.idealRowStart) / 2);
  const rowsToTry = [
    ...idealRows.reverse(), // Reverse to start from back rows
    // Add deviation rows after ideal rows
    ...Array.from(
      { length: settings.maxVIPRowDeviation * 2 },
      (_, i) => {
        const offset = Math.floor(i / 2) + 1;
        return i % 2 === 0 
          ? centerRow + offset + 1 // Push back by 2 rows
          : centerRow - offset + 1;
      }
    )
  ];

  // Try each row in priority order
  for (const rowNum of rowsToTry) {
    const rowIdx = rowNum - 1; // Convert to 0-based index
    if (rowIdx < 0 || rowIdx >= seating.length) continue;
    
    const row = seating[rowIdx];
    const seats = getSeatsFromRow(row);
    
    // Calculate center position
    const centerSeat = Math.floor(seats.length / 2);
    const halfGroup = Math.floor(totalSeats / 2);
    
    // Try positions starting from center and moving outward
    for (let offset = 0; offset <= centerSeat; offset++) {
      // Try center-left position
      const leftStart = centerSeat - halfGroup - offset;
      if (leftStart >= 0 && leftStart + totalSeats <= seats.length) {
        const leftSeats = seats.slice(leftStart, leftStart + totalSeats);
        if (leftSeats.every(seat => !seat.guest)) {
          await assignTeacherPairToSeats(
            teacher1, teacher2, leftSeats, currentDay, day, seating, rowNum
          );
          return true;
        }
      }

      // Try center-right position
      const rightStart = centerSeat + offset;
      if (rightStart + totalSeats <= seats.length) {
        const rightSeats = seats.slice(rightStart, rightStart + totalSeats);
        if (rightSeats.every(seat => !seat.guest)) {
          await assignTeacherPairToSeats(
            teacher1, teacher2, rightSeats, currentDay, day, seating, rowNum
          );
          return true;
        }
      }
    }
  }
  
  return false;
}

// Helper function to assign teacher pairs to seats
async function assignTeacherPairToSeats(
  teacher1: Guest,
  teacher2: Guest,
  seats: SeatAssignment[],
  currentDay: any,
  day: Day,
  seating: Row[],
  rowNum: number
): Promise<void> {
  // Double-check that neither teacher is already in the seat assignments
  const existingTeacher1 = currentDay.seats?.find((seat: any) => seat.guestId === teacher1.id);
  const existingTeacher2 = currentDay.seats?.find((seat: any) => seat.guestId === teacher2.id);
  
  if (existingTeacher1) {
    console.log(`Warning: Teacher ${teacher1.voornaam} ${teacher1.achternaam} already has seats assigned on ${day}`);
  }
  
  if (existingTeacher2) {
    console.log(`Warning: Teacher ${teacher2.voornaam} ${teacher2.achternaam} already has seats assigned on ${day}`);
  }

  const teacher1Seats = seats.slice(0, parseInt(teacher1.aantalKaarten));
  const teacher2Seats = seats.slice(parseInt(teacher1.aantalKaarten));
  
  teacher1Seats.forEach(seat => {
    seat.guest = teacher1;
    seat.together = true;
  });
  
  teacher2Seats.forEach(seat => {
    seat.guest = teacher2;
    seat.together = true;
  });
  
  // Update the total seat count
  currentDay.assigned += seats.length;
  if (!currentDay.seats) currentDay.seats = [];
  
  // Only add teacher1 to seats if not already there
  if (!existingTeacher1) {
    currentDay.seats.push({
      guestId: teacher1.id,
      seats: parseInt(teacher1.aantalKaarten),
      assignedDay: day
    });
  }
  
  // Only add teacher2 to seats if not already there
  if (!existingTeacher2) {
    currentDay.seats.push({
      guestId: teacher2.id,
      seats: parseInt(teacher2.aantalKaarten),
      assignedDay: day
    });
  }
  
  await setSeatsForDay(day, seating);
  console.log(`Seated teachers together: ${teacher1.voornaam} and ${teacher2.voornaam} in row ${rowNum} (center)`);
}

async function tryAssignGuestToDay(
  guest: Guest,
  day: Day,
  preferences: SeatingPreference[],
  dayAssignments: DaySeating
): Promise<boolean> {
  const seating = await getSeatsForDay(day) as SeatingMatrix;
  
  // Add the day name to the matrix for reference
  seating.dayName = day;
  
  const aantalKaarten = parseInt(guest.aantalKaarten, 10);

  // Get settings for VIP handling
  const settingsStr = await db.get('settings');
  const settings: AlgorithmSettings = settingsStr ? JSON.parse(settingsStr) : {
    idealRowStart: 3,
    idealRowEnd: 6,
    maxVIPRowDeviation: 2,
  };

  // Check capacity
  const currentDay = dayAssignments[day];
  if (!currentDay || (currentDay.assigned + aantalKaarten > currentDay.capacity)) {
    console.log(`Cannot assign to ${day} capacity would be exceeded: ${currentDay?.assigned || 0} + ${aantalKaarten} > ${currentDay?.capacity}`);
    return false;
  }
  
  // Check if this is actually a preferred day for the guest
  const isFirstDay = guest.voorkeurDag1.toLowerCase() === day;
  const isSecondDay = guest.voorkeurDag2.toLowerCase() === day;
  
  if (!isFirstDay && !isSecondDay) {
    console.log(`Warning: Attempting to place ${guest.voornaam} ${guest.achternaam} on ${day} which is not their preference`);
    console.log(`Their preferences are: Day 1: ${guest.voorkeurDag1}, Day 2: ${guest.voorkeurDag2}`);
  }

  // Check if this is a VIP on their preferred day
  const isVip = guest.isErelid || guest.isDocent || guest.speeltMee;
  const isPreferredDay = guest.voorkeurDag1.toLowerCase() === day || guest.voorkeurDag2.toLowerCase() === day;

  // For VIPs on preferred days, we'll relax the row constraints and allow balcony if needed
  if (isVip && isPreferredDay) {
    console.log(`Trying to place VIP ${guest.voornaam} on their preferred day ${day} with relaxed constraints`);
    
    // First try ideal rows
    const availableRows = seating.filter((_: Row, index: number) => {
      const rowNum = index + 1;
      const minAllowedRow = settings.idealRowStart - settings.maxVIPRowDeviation;
      const maxAllowedRow = settings.idealRowEnd + settings.maxVIPRowDeviation;
      return rowNum >= minAllowedRow && rowNum <= maxAllowedRow;
    });

    // Try first with standard constraints
    if (availableRows.length > 0) {
      // Start with a low threshold for ideal rows
      let currentThreshold = 2;
      while (currentThreshold <= 10) {
        if (await tryAssignSeats(guest, seating, aantalKaarten, currentThreshold, preferences)) {
          // Update assignments and return success
          currentDay.assigned += aantalKaarten;
          if (!currentDay.seats) currentDay.seats = [];
          currentDay.seats.push({
            guestId: guest.id,
            seats: aantalKaarten,
            assignedDay: day
          });
          await setSeatsForDay(day, seating);
          
          console.log(`Successfully assigned VIP ${guest.voornaam} to ideal rows on ${day}`);
          return true;
        }
        currentThreshold += 2;
      }
    }

    // If we couldn't place in ideal rows, allow ANY row (including balcony) for VIPs on preferred day
    // This is better than changing their day
    console.log(`Trying to place VIP ${guest.voornaam} on preferred day ${day} in any available seats (including balcony)`);
    
    // Use higher threshold to allow less optimal seats including balcony
    let currentThreshold = 3;
    while (currentThreshold <= 40) {
      // Use a modified tryAssignSeats that allows balcony for VIPs
      if (await tryAssignSeats(guest, seating, aantalKaarten, currentThreshold, preferences)) {
        // Update assignments
        currentDay.assigned += aantalKaarten;
        if (!currentDay.seats) currentDay.seats = [];
        currentDay.seats.push({
          guestId: guest.id,
          seats: aantalKaarten,
          assignedDay: day
        });
        await setSeatsForDay(day, seating);
        
        console.log(`Successfully assigned VIP ${guest.voornaam} to ${day} using relaxed constraints (may include balcony)`);
        return true;
      }
      currentThreshold += 5; // Larger jumps for efficiency
    }
    
    // If we still can't assign, check if blocked seats are the issue
    const isBlockedSeatIssue = await checkBlockedSeatConflict(guest, day, seating, aantalKaarten);
    if (isBlockedSeatIssue) {
      const conflictResult = await handleBlockedSeatConflict(guest, day, aantalKaarten, dayAssignments);
      
      if (conflictResult.action === 'use_blocked' && conflictResult.success) {
        return true;
      } else if (conflictResult.action === 'reorder_tickets' && conflictResult.success) {
        return true;
      } else if (conflictResult.action === 'try_second_preference') {
        // Returning false will make the caller try the second preference day
        return false;
      } else {
        // Cancel or failure
        return false;
      }
    }
  }

  // Standard flow for non-VIPs or VIPs on non-preferred days
  let currentThreshold = 3;
  
  // Apply stronger preference for performers on first choice day (Friday)
  if (guest.speeltMee && guest.voorkeurDag1.toLowerCase() === day && day === 'vrijdag') {
    // Use much lower threshold to ensure performers are placed on their preferred day
    currentThreshold = 1;
    console.log(`Using special low threshold ${currentThreshold} for performer ${guest.voornaam} on Friday`);
  }
  
  while (currentThreshold <= 20) {
    // Apply day preference adjustment to threshold
    const adjustedThreshold = getAdjustedThresholdForDay(guest, day, currentThreshold);
    console.log(`Guest ${guest.voornaam}: base threshold ${currentThreshold}, adjusted: ${adjustedThreshold}`);
    
    if (await tryAssignSeats(guest, seating, aantalKaarten, adjustedThreshold, preferences)) {
      // Update assignments
      currentDay.assigned += aantalKaarten;
      if (!currentDay.seats) currentDay.seats = [];
      currentDay.seats.push({
        guestId: guest.id,
        seats: aantalKaarten,
        assignedDay: day
      });
      await setSeatsForDay(day, seating);
      
      console.log(`Successfully assigned ${guest.voornaam} to ${day} (${guest.speeltMee ? 'Performer' : 'Regular'})`);
      return true;
    }
    currentThreshold += 2;
  }
  
  // If we still can't assign, check if blocked seats are the issue
  const isBlockedSeatIssue = await checkBlockedSeatConflict(guest, day, seating, aantalKaarten);
  if (isBlockedSeatIssue) {
    await logAlgorithm({
      type: 'warning',
      message: `Geblokkeerde stoelen verhinderen plaatsing van ${guest.voornaam} ${guest.achternaam} op ${day}`,
      phase: 'seating',
      timestamp: new Date().toISOString()
    });
    
    // Always require explicit permission through dialog
    const conflictResult = await handleBlockedSeatConflict(guest, day, aantalKaarten, dayAssignments);
    
    // Handle conflict result - Never automatically use blocked seats
    if (conflictResult.action === 'use_blocked' && conflictResult.success) {
      // Double-check that this was an explicit user choice
      console.log(`Blocked seats used for ${guest.voornaam} with explicit permission`);
      return true;
    } else if (conflictResult.action === 'reorder_tickets' && conflictResult.success) {
      return true;
    } else if (conflictResult.action === 'try_second_preference') {
      // Returning false will make the caller try the second preference day
      return false;
    } else {
      // Cancel or failure
      return false;
    }
  }

  return false;
}

// Assign seat based on priority in the matrix
async function assignSeatBasedOnPriority(guest: Guest, matrix: Row[]): Promise<boolean> {
  const aantalKaarten = parseInt(guest.aantalKaarten, 10);
  
  // Start with ideal seats (priority <= 3)
  let currentThreshold = 3;
  
  // Gradually increase threshold up to 20
  while (currentThreshold <= 20) {
    if (await tryAssignSeats(guest, matrix, aantalKaarten, currentThreshold, [])) {
      // console.log(`Found seats for ${guest.voornaam} ${guest.achternaam} with threshold ${currentThreshold}`);
      return true;
    }
    // Increase threshold by 2 each time
    currentThreshold += 2;
  }
  
  // If no seats found with increasing threshold, try any available seats
  if (await tryAssignSeats(guest, matrix, aantalKaarten, Number.MAX_VALUE, [])) {
    // console.log(`Found fallback seats for ${guest.voornaam} ${guest.achternaam}`);
    return true;
  }
  
  return false;
}

// Add this helper function to determine if a guest is priority
function isPriorityGuest(guest: Guest): boolean {
  return guest.isErelid || guest.isDocent || guest.speeltMee;
}

// Add this helper function to check if two guests can sit together
function canSitTogether(guest1: Guest, guest2: Guest): boolean {
  return guest1.leerlingnummer === guest2.leerlingnummer && 
         guest1.leerlingnummer !== undefined && 
         guest2.leerlingnummer !== undefined;
}

// Add new function to try moving others for priority seating
async function tryMovingOthersForPriority(
  guest: Guest,
  preference: SeatingPreference,
  matrix: SeatingMatrix,
  aantalKaarten: number,
  maxPriority: number
): Promise<boolean> {
  // If guest is already seated, don't try to seat them again
  if (isGuestAlreadySeated(matrix, guest.id)) {
    return false;
  }
  
  // Check if this is the correct day for both guests
  if (matrix.dayName) {
    const dayName = matrix.dayName.toLowerCase();
    const isGuestPreferredDay = 
      guest.voorkeurDag1.toLowerCase() === dayName || 
      guest.voorkeurDag2.toLowerCase() === dayName;
    
    const isPrefGuestPreferredDay =
      preference.preferredGuest.voorkeurDag1.toLowerCase() === dayName || 
      preference.preferredGuest.voorkeurDag2.toLowerCase() === dayName;
    
    if (!isGuestPreferredDay || !isPrefGuestPreferredDay) {
      console.log(`Cannot move others for priority - day ${dayName} is not preferred for both guests`);
      return false;
    }
  }
  
  const settingsStr = await db.get('settings');
  const settings: AlgorithmSettings = settingsStr ? JSON.parse(settingsStr) : {
    maxMovesForPreference: 3
  };

  // Find where the preferred guest is seated
  let preferredLocation: { rowIndex: number; seatIndex: number } | null = null;
  
  matrix.forEach((row, rowIndex) => {
    getSeatsFromRow(row).forEach((seat, seatIndex) => {
      if (seat.guest?.id === preference.preferredGuest.id) {
        preferredLocation = { rowIndex, seatIndex };
      }
    });
  });

  if (!preferredLocation) return false;

  const { rowIndex, seatIndex } = preferredLocation;
  const row = getSeatsFromRow(matrix[rowIndex]);
  
  // Try both sides of the preferred guest
  const leftSide = row.slice(Math.max(0, seatIndex - aantalKaarten), seatIndex);
  const rightSide = row.slice(seatIndex + 1, seatIndex + 1 + aantalKaarten);

  // Helper function to try moving existing guests
  const tryMovingGuests = async (seats: SeatAssignment[]): Promise<boolean> => {
    if (seats.length !== aantalKaarten) return false;

    // IMPORTANT: Check for blocked seats and reject immediately
    if (seats.some(seat => seat.blocked)) {
      console.log(`Cannot move guests for priority - blocked seats found in target area for ${guest.voornaam}`);
      return false;
    }

    // Only try moving non-priority guests
    const existingGuests = seats
      .map(seat => seat.guest)
      .filter(g => g && !isPriorityGuest(g));

    if (existingGuests.length === 0) return false;

    // Try to find new seats for existing guests
    for (const existingGuest of existingGuests) {
      if (!existingGuest) continue;
      
      // Remove guest temporarily
      seats.forEach(seat => {
        if (seat.guest?.id === existingGuest.id) {
          seat.guest = null;
          seat.together = false;
        }
      });

      // Try to find new seats for this guest
      if (!await tryNormalSeating(existingGuest, matrix, parseInt(existingGuest.aantalKaarten), maxPriority * 1.5)) {
        // If we can't find new seats, put them back
        seats.forEach(seat => {
          if (!seat.guest) {
            seat.guest = existingGuest;
          }
        });
        return false;
      }
    }

    // If we've made it here, we've successfully moved all existing guests
    // Now assign the priority guest
    seats.forEach(seat => {
      seat.guest = guest;
      seat.together = true;
    });

    // Mark the preferred guest's seats as together too
    getSeatsFromRow(matrix[rowIndex]).forEach(seat => {
      if (seat.guest?.id === preference.preferredGuest.id) {
        seat.together = true;
      }
    });

    return true;
  };

  // Try both sides
  return await tryMovingGuests(leftSide) || await tryMovingGuests(rightSide);
}

// Add new interface for group seating options
interface GroupSeatingOption {
  rowIndex: number;
  startIndex: number;
  score: number;
  requiredMoves: Array<{
    guest: Guest;
    currentSeats: SeatAssignment[];
  }>;
}

// Add after existing interfaces
function findBestGroupLocation(
  matrix: Row[],
  totalSeatsNeeded: number,
  settings: any,
  excludeBalcony: boolean = false
): GroupSeatingOption[] {
  const options: GroupSeatingOption[] = [];

  matrix.forEach((row, rowIndex) => {
    // Skip balcony if excluded
    if (excludeBalcony && isBalconyRow(rowIndex)) return;

    const seats = getSeatsFromRow(row);
    const rowLength = seats.length;
    
    // Try each possible starting position
    for (let startIndex = 0; startIndex <= rowLength - totalSeatsNeeded; startIndex++) {
      const potentialSeats = seats.slice(startIndex, startIndex + totalSeatsNeeded);
      
      // IMPORTANT: Skip if any seat is blocked
      if (potentialSeats.some(seat => seat.blocked)) {
        continue;
      }
      
      const occupiedSeats = potentialSeats.filter(seat => seat.guest !== null);
      
      // Calculate score and required moves
      const score = calculateSeatScore(rowIndex, startIndex, rowLength, settings, isBalconyRow(rowIndex));
      const requiredMoves = occupiedSeats.map(seat => ({
        guest: seat.guest!,
        currentSeats: findCurrentSeatsForGuest(matrix, seat.guest!),
      }));

      options.push({
        rowIndex,
        startIndex,
        score,
        requiredMoves,
      });
    }
  });

  // Sort options by score and number of required moves
  return options.sort((a, b) => {
    if (a.requiredMoves.length !== b.requiredMoves.length) {
      return a.requiredMoves.length - b.requiredMoves.length;
    }
    return b.score - a.score;
  });
}

// Add helper function to find all current seats for a guest
function findCurrentSeatsForGuest(matrix: Row[], guest: Guest): SeatAssignment[] {
  const currentSeats: SeatAssignment[] = [];
  matrix.forEach(row => {
    const seats = getSeatsFromRow(row);
    seats.forEach(seat => {
      if (seat.guest?.id === guest.id) {
        currentSeats.push(seat);
      }
    });
  });
  return currentSeats;
}

// Update tryRelocationSeating to allow VIPs on balcony when needed
async function tryRelocationSeating(
  guest: Guest,
  preference: SeatingPreference,
  matrix: SeatingMatrix,
  aantalKaarten: number,
  maxPriority: number
): Promise<boolean> {
  // If guest is already seated, don't try to seat them again
  if (isGuestAlreadySeated(matrix, guest.id)) {
    return false;
  }
  
  if (matrix.dayName) {
    const dayName = matrix.dayName.toLowerCase();
    
    // Check if this is first or second choice day for both guests
    const isGuestFirstDay = guest.voorkeurDag1.toLowerCase() === dayName;
    const isGuestSecondDay = guest.voorkeurDag2.toLowerCase() === dayName;
    const isPreferredDay = isGuestFirstDay || isGuestSecondDay;
    
    const isPrefGuestFirstDay = preference.preferredGuest.voorkeurDag1.toLowerCase() === dayName;
    const isPrefGuestSecondDay = preference.preferredGuest.voorkeurDag2.toLowerCase() === dayName;
    const isPrefGuestPreferredDay = isPrefGuestFirstDay || isPrefGuestSecondDay;
    
    if (!isPreferredDay || !isPrefGuestPreferredDay) {
      console.log(`Cannot relocate for priority - day ${dayName} is not preferred for both guests`);
      return false;
    }
    
    // If this is second choice day for either guest, reduce priority
    if ((!isGuestFirstDay || !isPrefGuestFirstDay) && 
        (isGuestSecondDay || isPrefGuestSecondDay)) {
      console.log(`Using reduced priority for seating together on second choice day ${dayName}`);
      maxPriority *= 0.9; // Apply penalty for using second preference day
    }
  }
  
  const preferredGuestSeats = parseInt(preference.preferredGuest.aantalKaarten, 10);
  const totalSeatsNeeded = aantalKaarten + preferredGuestSeats;

  // Get all possible locations sorted by best options
  const options = findBestGroupLocation(
    matrix,
    totalSeatsNeeded,
    { 
      idealRowStart: 3, 
      idealRowEnd: 8,
      preferCenter: true // Add this flag
    },
    false // Allow VIPs to be relocated to balcony if needed
  );

  // Try each option until we find one that works
  for (const option of options) {
    // Skip if too many moves needed (adjust threshold as needed)
    if (option.requiredMoves.length > 5) continue;

    // IMPORTANT: Skip options that include blocked seats
    if (!verifyNoBlockedSeats(matrix, option.rowIndex, option.startIndex, totalSeatsNeeded)) {
      console.log(`Skipping relocation option for ${guest.voornaam} - blocked seats found at row ${option.rowIndex + 1}`);
      continue;
    }
    
    // Try to relocate all guests that need to be moved
    let allMovesSuccessful = true;
    const tempMatrix = JSON.parse(JSON.stringify(matrix)); // Deep copy for testing

    for (const move of option.requiredMoves) {
      // Skip if trying to move a priority guest
      if (isPriorityGuest(move.guest)) {
        allMovesSuccessful = false;
        break;
      }

      // Clear current seats
      move.currentSeats.forEach(seat => {
        seat.guest = null;
        seat.together = false;
      });

      // Try to find new seats
      if (!await tryNormalSeating(move.guest, tempMatrix, move.currentSeats.length, maxPriority * 1.5)) {
        allMovesSuccessful = false;
        break;
      }
    }

    if (allMovesSuccessful) {
      // Apply the moves to the real matrix

      Object.assign(matrix, tempMatrix);

      // Assign the group to their new seats
      const row = getSeatsFromRow(matrix[option.rowIndex]);
      const groupSeats = row.slice(option.startIndex, option.startIndex + totalSeatsNeeded);

      // Assign first half to preferred guest
      groupSeats.slice(0, preferredGuestSeats).forEach(seat => {
        seat.guest = preference.preferredGuest;
        seat.together = true;
      });

      // Assign second half to current guest
      groupSeats.slice(preferredGuestSeats).forEach(seat => {
        seat.guest = guest;
        seat.together = true;
      });

      return true;
    }
  }

  return false;
}

// Update findTeacherPreferences function
async function findTeacherPreferences(guests: Guest[]): Promise<SeatingPreference[]> {
  const preferences: SeatingPreference[] = [];
  const teacherMap = new Map<string, Guest>();
  
  // Create map of all teachers by email, normalized to lowercase
  guests.filter(g => g.isDocent).forEach(teacher => {
    if (teacher.email) {
      teacherMap.set(teacher.email.toLowerCase(), teacher);
    }
  });

  // Process each teacher's preferences
  guests.filter(g => g.isDocent && g.voorkeurEmail).forEach(teacher => {
    const preferredEmails = teacher.voorkeurEmail!.split(',');
    
    for (const email of preferredEmails) {
      const normalizedEmail = email.trim().toLowerCase();
      const preferredTeacher = teacherMap.get(normalizedEmail);
      
      // Skip if teacher prefers themselves
      if (preferredTeacher && preferredTeacher.id === teacher.id) {
        console.log(`Skipping self-preference for teacher ${teacher.voornaam} (email: ${teacher.email})`);
        continue;
      }
      
      if (preferredTeacher && sharePreferredDay(teacher, preferredTeacher)) {
        // Check mutual preference using normalized emails
        const isMutual = preferredTeacher.voorkeurEmail?.toLowerCase()
          .split(',')
          .map(e => e.trim().toLowerCase())
          .includes(teacher.email.toLowerCase());

        preferences.push({
          guest: teacher,
          preferredGuest: preferredTeacher,
          isMutualPreference: isMutual,
          isTeacherPreference: true
        });

        console.log(`Found teacher preference: ${teacher.voornaam} -> ${preferredTeacher.voornaam} (Mutual: ${isMutual})`);
      }
    }
  });

  return preferences;
}

// Add new helper function to try all possible days for teacher pairs
async function tryAssignTeacherPairAnyDay(
  teacher1: Guest,
  teacher2: Guest,
  days: Day[],
  dayAssignments: DaySeating
): Promise<boolean> {
  // Try shared preferred days first
  const sharedDays = days.filter(day => 
    (teacher1.voorkeurDag1.toLowerCase() === day || teacher1.voorkeurDag2.toLowerCase() === day) &&
    (teacher2.voorkeurDag1.toLowerCase() === day || teacher2.voorkeurDag2.toLowerCase() === day)
  );

  // Try shared days first
  for (const day of sharedDays) {
    if (await tryAssignTeacherPair(teacher1, teacher2, day, dayAssignments)) {
      return true;
    }
  }

  // If no shared days work, try any day
  for (const day of days) {
    if (!sharedDays.includes(day)) {
      if (await tryAssignTeacherPair(teacher1, teacher2, day, dayAssignments)) {
        return true;
      }
    }
  }

  return false;
}

// Add interface for handling blocked seat conflicts
interface BlockedSeatConflictResult {
  action: 'use_blocked' | 'try_second_preference' | 'reorder_tickets' | 'cancel';
  success?: boolean;
}

// Add function to check if blocked seats are preventing assignment
async function checkBlockedSeatConflict(
  guest: Guest, 
  day: Day, 
  seating: Row[], 
  aantalKaarten: number
): Promise<boolean> {
  // Get blocked seats for this day
  const blockedSeats = await getBlockedSeats(day);
  if (blockedSeats.length === 0) return false;
  
  // Create a temporary matrix without blocked seats
  const tempMatrix = JSON.parse(JSON.stringify(seating));
  
  // Unblock all seats in the temp matrix
  tempMatrix.forEach((row: Row, rowIndex: number) => {
    const seats = getSeatsFromRow(row);
    seats.forEach((seat, seatIndex) => {
      if (seat.blocked) {
        seat.blocked = false;
        seat.reason = undefined;
      }
    });
  });
  
  // Try to assign with unblocked seats
  const preferences: SeatingPreference[] = [];
  const result = await tryAssignSeats(guest, tempMatrix, aantalKaarten, 20, preferences);
  
  return result; // If we could assign without blocked seats, then blocked seats are the issue
}

// Add a function to handle blocked seat conflicts
async function handleBlockedSeatConflict(
  guest: Guest, 
  day: Day, 
  aantalKaarten: number, 
  dayAssignments: DaySeating
): Promise<BlockedSeatConflictResult> {
  // Show dialog using electron
  const secondDay = guest.voorkeurDag2.toLowerCase() as Day;
  
  // Get the current window to associate with dialog
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  
  // Change button order to make "Use blocked seats" the last option, not the default
  const result = await dialog.showMessageBox(window, {
    type: 'question',
    buttons: [
      `Probeer voorkeur dag 2 (${secondDay})`,
      'Probeer kleine groepen verplaatsen',
      'Gebruik geblokkeerde stoelen', 
      'Annuleren'
    ],
    defaultId: 0, // Make trying day 2 the default
    title: 'Geblokkeerde Stoelen Conflict',
    message: `${guest.voornaam} ${guest.achternaam} kan niet geplaatst worden op ${day} vanwege geblokkeerde stoelen.`,
    detail: `Deze gast heeft ${aantalKaarten} kaarten nodig, maar kan niet geplaatst worden vanwege geblokkeerde stoelen. 
    
    Wat wilt u doen?`,
    cancelId: 3,
  });
  
  const response = result.response;
  
  if (response === 0) {
    // Try second preference (now first button)
    return { action: 'try_second_preference' };
  } else if (response === 1) {
    // Reorder tickets (now second button)
    return await tryReorderTickets(guest, day, aantalKaarten, dayAssignments);
  } else if (response === 2) {
    // Use blocked seats (now third button)
    return await useBlockedSeatsForGuest(guest, day, aantalKaarten, dayAssignments);
  } else {
    // Cancel
    return { action: 'cancel' };
  }
}

// Update function to use blocked seats for a guest to require explicit confirmation
async function useBlockedSeatsForGuest(
  guest: Guest, 
  day: Day, 
  aantalKaarten: number, 
  dayAssignments: DaySeating
): Promise<BlockedSeatConflictResult> {
  try {
    // Get confirmation from the user explicitly
    const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const confirmation = await dialog.showMessageBox(window, {
      type: 'warning',
      buttons: ['Ja, gebruik geblokkeerde stoelen', 'Nee, annuleren'],
      defaultId: 1, // Default to NO
      cancelId: 1,
      title: 'Bevestiging geblokkeerde stoelen',
      message: `Weet u zeker dat u geblokkeerde stoelen wilt gebruiken voor ${guest.voornaam} ${guest.achternaam}?`,
      detail: `Deze actie zal ${aantalKaarten} geblokkeerde stoelen vrijmaken op ${day}. Dit kan gevolgen hebben voor de zaalindeling.`,
    });
    
    // If user didn't explicitly confirm, cancel the operation
    if (confirmation.response !== 0) {
      await logAlgorithm({
        type: 'info',
        message: `Gebruiker heeft geweigerd geblokkeerde stoelen te gebruiken voor ${guest.voornaam} ${guest.achternaam}`,
        phase: 'seating',
        timestamp: new Date().toISOString()
      });
      return { action: 'use_blocked', success: false };
    }

    // Get original seating for day
    const seating = await getSeatsForDay(day);
    
    // Create a temporary matrix without blocked seats
    const tempMatrix = JSON.parse(JSON.stringify(seating));
    
    // Unblock all seats in the temp matrix
    tempMatrix.forEach((row: Row, rowIndex: number) => {
      const seats = getSeatsFromRow(row);
      seats.forEach((seat, seatIndex) => {
        if (seat.blocked) {
          seat.blocked = false;
          seat.reason = undefined;
        }
      });
    });
    
    // Try to assign with unblocked seats
    if (await tryAssignSeats(guest, tempMatrix, aantalKaarten, 20, [])) {
      // Update the real seating matrix
      await setSeatsForDay(day, tempMatrix);
      
      // Update day assignments
      const currentDay = dayAssignments[day];
      currentDay.assigned += aantalKaarten;
      if (!currentDay.seats) currentDay.seats = [];
      currentDay.seats.push({
        guestId: guest.id,
        seats: aantalKaarten,
        assignedDay: day
      });
      
      // Unblock the seats in the database
      const usedBlockedSeats: { row: number, seat: number }[] = [];
      tempMatrix.forEach((row: Row, rowIndex: number) => {
        const seats = getSeatsFromRow(row);
        seats.forEach((seat, seatIndex) => {
          if (seat.guest?.id === guest.id) {
            usedBlockedSeats.push({ row: rowIndex + 1, seat: seat.stoel });
          }
        });
      });
      
      // Unblock each seat that we used
      for (const seatInfo of usedBlockedSeats) {
        await unblockSeat(day, seatInfo.row, seatInfo.seat);
      }
      
      await logAlgorithm({
        type: 'info',
        message: `Geblokkeerde stoelen gebruikt voor ${guest.voornaam} ${guest.achternaam} op ${day} met expliciete toestemming`,
        phase: 'seating',
        timestamp: new Date().toISOString()
      });
      
      return { action: 'use_blocked', success: true };
    } else {
      await logAlgorithm({
        type: 'warning',
        message: `Kon geen geblokkeerde stoelen gebruiken voor ${guest.voornaam} ${guest.achternaam} op ${day}`,
        phase: 'seating',
        timestamp: new Date().toISOString()
      });
      return { action: 'use_blocked', success: false };
    }
  } catch (error) {
    console.error('Error using blocked seats:', error);
    await logAlgorithm({
      type: 'error',
      message: `Fout bij gebruik geblokkeerde stoelen: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
      phase: 'seating',
      timestamp: new Date().toISOString()
    });
    return { action: 'use_blocked', success: false };
  }
}

// Enhanced tryReorderTickets to try harder with small groups
async function tryReorderTickets(
  guest: Guest, 
  day: Day, 
  aantalKaarten: number, 
  dayAssignments: DaySeating
): Promise<BlockedSeatConflictResult> {
  try {
    const seating = await getSeatsForDay(day);
    
    // Find smaller groups that could be moved
    const smallerGroups = new Map<number, Set<SeatAssignment>>();
    const guestGroups = new Map<number, Guest>();
    
    seating.forEach((row: Row, rowIndex: number) => {
      const seats = getSeatsFromRow(row);
      seats.forEach(seat => {
        if (seat.guest && !seat.blocked) {
          const guestId = seat.guest.id;
          if (!smallerGroups.has(guestId)) {
            smallerGroups.set(guestId, new Set());
            guestGroups.set(guestId, seat.guest);
          }
          smallerGroups.get(guestId)?.add(seat);
        }
      });
    });
    
    // Improved filtering - be more aggressive about which groups can be moved
    // Prioritize non-VIPs and small groups that aren't on their first preference day
    const movableGroups = Array.from(smallerGroups.entries())
      .filter(([guestId, seats]) => {
        const g = guestGroups.get(guestId);
        if (!g) return false;
        
        // Never move VIPs or groups larger than our target
        if (isPriorityGuest(g) || seats.size > aantalKaarten * 1.5) return false;
        
        // More aggressively move groups on their second preference day
        const isFirstPreferenceDay = g.voorkeurDag1.toLowerCase() === day;
        if (!isFirstPreferenceDay) return true;
        
        // Move smaller groups more freely (less than 4 seats)
        return seats.size <= 3;
      })
      .sort((a, b) => {
        // Sort by: second preference day first, then by size
        const guestA = guestGroups.get(a[0]);
        const guestB = guestGroups.get(b[0]);
        
        const aIsFirstPref = guestA?.voorkeurDag1.toLowerCase() === day;
        const bIsFirstPref = guestB?.voorkeurDag1.toLowerCase() === day;
        
        // Prioritize moving people on their second preference day
        if (aIsFirstPref !== bIsFirstPref) {
          return aIsFirstPref ? 1 : -1; // Second preference day groups first
        }
        
        return a[1].size - b[1].size; // Then sort by size (smallest first)
      });
    
    // ENHANCED: Try multiple combinations of groups instead of just one
    // Use a knapsack-like approach to find optimal combinations
    const findOptimalCombination = (targetSize: number, maxGroupsToMove = 10) => {
      // Try to find exact combinations first (more efficient)
      // Try starting from different positions to find more options
      for (let startIdx = 0; startIdx < movableGroups.length; startIdx++) {
        let currentSize = 0;
        const combination: [number, Set<SeatAssignment>][] = [];
        
        // Try to build a combination starting from this index
        for (let i = startIdx; i < movableGroups.length && combination.length < maxGroupsToMove; i++) {
          const [guestId, seats] = movableGroups[i];
          if (currentSize + seats.size <= targetSize) {
            combination.push([guestId, seats]);
            currentSize += seats.size;
            if (currentSize >= targetSize * 0.95) { // Allow slightly smaller combinations
              return { combination, totalSize: currentSize };
            }
          }
        }
      }
      
      // If exact combinations weren't found, find the best approximation
      let bestCombination: [number, Set<SeatAssignment>][] = [];
      let bestSize = 0;
      
      // Try all starting points with a sliding window approach
      for (let startIdx = 0; startIdx < movableGroups.length; startIdx++) {
        for (let windowSize = Math.min(8, movableGroups.length - startIdx); windowSize > 0; windowSize--) {
          let currentSize = 0;
          const combination: [number, Set<SeatAssignment>][] = [];
          
          // Try window of consecutive groups
          for (let i = 0; i < windowSize && startIdx + i < movableGroups.length; i++) {
            const [guestId, seats] = movableGroups[startIdx + i];
            combination.push([guestId, seats]);
            currentSize += seats.size;
          }
          
          // Update best combination if this is better
          if (currentSize > bestSize && currentSize >= targetSize * 0.9) {
            bestCombination = [...combination];
            bestSize = currentSize;
            if (bestSize >= targetSize) break; // Early exit if we found a good enough solution
          }
        }
        
        if (bestSize >= targetSize) break; // Early exit if we found a good enough solution
      }
      
      return { combination: bestCombination, totalSize: bestSize };
    };
    
    // Find the best combination of groups to move - try harder with more groups
    const { combination: optimalGroups, totalSize } = findOptimalCombination(aantalKaarten, 12);
    
    if (totalSize < aantalKaarten * 0.9) { // Allow 10% less than needed
      // ENHANCED: Try even harder with more groups and a more aggressive approach
      const { combination: fallbackGroups, totalSize: fallbackSize } = findOptimalCombination(aantalKaarten, 16);
      
      if (fallbackSize < aantalKaarten * 0.9) {
        // Get the current window to associate with dialog
        const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        await dialog.showMessageBox(window, {
          type: 'info',
          title: 'Herschikken Niet Mogelijk',
          message: 'Geen geschikte combinatie gevonden',
          detail: `Er zijn niet genoeg groepen gevonden die verplaatst kunnen worden om plaats te maken voor ${guest.voornaam} ${guest.achternaam} (${aantalKaarten} kaarten).`,
          buttons: ['OK']
        });
        return { action: 'reorder_tickets', success: false };
      }
      
      // Use fallback if primary attempt failed
      optimalGroups.length = 0;
      fallbackGroups.forEach(group => optimalGroups.push(group));
    }
    
    // Build group list for display
    let groupList = '';
    for (const [guestId, seats] of optimalGroups) {
      const g = guestGroups.get(guestId);
      if (g) {
        groupList += `- ${g.voornaam} ${g.achternaam} (${seats.size} kaarten)\n`;
      }
    }
    
    // Get confirmation
    const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    
    const confirmation = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Ja, verplaats deze groepen', 'Nee, annuleer'],
      defaultId: 0,
      title: 'Bevestig Herschikking',
      message: `Wilt u de volgende groepen verplaatsen om ruimte te maken?`,
      detail: `De volgende groepen kunnen verplaatst worden:\n\n${groupList}\nDit maakt ruimte voor ${guest.voornaam} ${guest.achternaam} (${aantalKaarten} kaarten).`,
      cancelId: 1
    });
    
    if (confirmation.response === 1) {
      return { action: 'reorder_tickets', success: false };
    }
    
    // Create a temporary copy of the seating arrangement
    const tempMatrix = JSON.parse(JSON.stringify(seating));
    
    // Remove the groups to be moved
    for (const [guestId, seats] of optimalGroups) {
      for (const seat of Array.from(seats)) {
        tempMatrix.forEach((row: Row) => {
          const tempSeats = getSeatsFromRow(row);
          tempSeats.forEach(tempSeat => {
            if (tempSeat.guest?.id === guestId) {
              tempSeat.guest = null;
              tempSeat.together = false;
            }
          });
        });
      }
    }
    
    // Try to place our target guest in the newly freed space
    if (await tryAssignSeats(guest, tempMatrix, aantalKaarten, 20, [])) {
      // ENHANCED: Try harder to find new places for moved groups
      let allGroupsReseated = true;
      const failedGroups: string[] = [];
      
      // Try multiple times with increasing priority thresholds
      for (const [guestId, seats] of optimalGroups) {
        const g = guestGroups.get(guestId);
        if (!g) continue;
        
        const groupSize = seats.size;
        let reseated = false;
        
        // Try increasingly desperate measures to reseat the group
        const thresholds = [15, 25, 40, 60];
        for (const threshold of thresholds) {
          if (await tryAssignSeats(g, tempMatrix, groupSize, threshold, [])) {
            reseated = true;
            break;
          }
        }
        
        if (!reseated) {
          allGroupsReseated = false;
          failedGroups.push(`${g.voornaam} ${g.achternaam} (${groupSize} kaarten)`);
        }
      }
      
      if (allGroupsReseated) {
        // Success! Save the new arrangement
        await setSeatsForDay(day, tempMatrix);
        
        // Update day assignments
        const currentDay = dayAssignments[day];
        currentDay.assigned += aantalKaarten;
        if (!currentDay.seats) currentDay.seats = [];
        currentDay.seats.push({
          guestId: guest.id,
          seats: aantalKaarten,
          assignedDay: day
        });
        
        await logAlgorithm({
          type: 'info',
          message: `Groepen herschikt om plaats te maken voor ${guest.voornaam} ${guest.achternaam} op ${day}`,
          phase: 'seating',
          timestamp: new Date().toISOString()
        });
        
        await dialog.showMessageBox(window, {
          type: 'info',
          title: 'Herschikking Geslaagd',
          message: 'Groepen succesvol herschikt',
          detail: `De groepen zijn succesvol verplaatst om plaats te maken voor ${guest.voornaam} ${guest.achternaam}.`,
          buttons: ['OK']
        });
        
        return { action: 'reorder_tickets', success: true };
      } else {
        await dialog.showMessageBox(window, {
          type: 'info',
          title: 'Herschikking Gedeeltelijk Mislukt',
          message: 'Niet alle groepen konden verplaatst worden',
          detail: `De volgende groepen konden niet worden herplaatst:\n\n${failedGroups.join('\n')}\n\nWilt u toch doorgaan met de herschikking?`,
          buttons: ['Ja, toch doorgaan', 'Nee, annuleren'],
          cancelId: 1
        }).then(async result => {
          if (result.response === 0) {
            // User wants to proceed anyway
            await setSeatsForDay(day, tempMatrix);
            
            // Update day assignments
            const currentDay = dayAssignments[day];
            currentDay.assigned += aantalKaarten;
            if (!currentDay.seats) currentDay.seats = [];
            currentDay.seats.push({
              guestId: guest.id,
              seats: aantalKaarten,
              assignedDay: day
            });
            
            await logAlgorithm({
              type: 'warning',
              message: `Groepen gedeeltelijk herschikt voor ${guest.voornaam} ${guest.achternaam} op ${day} (enkele groepen konden niet worden herplaatst)`,
              phase: 'seating',
              timestamp: new Date().toISOString()
            });
            
            return { action: 'reorder_tickets', success: true };
          }
          return { action: 'reorder_tickets', success: false };
        });
        
        return { action: 'reorder_tickets', success: false };
      }
    } else {
      await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Herschikking Mislukt',
        message: 'Kon de gast niet plaatsen na herschikking',
        detail: `Zelfs na het vrijmaken van stoelen kon ${guest.voornaam} ${guest.achternaam} niet geplaatst worden.`,
        buttons: ['OK']
      });
      return { action: 'reorder_tickets', success: false };
    }
  } catch (error) {
    console.error('Error reordering tickets:', error);
    return { action: 'reorder_tickets', success: false };
  }
}

// Add this helper function to track guests by day for verification
function logGuestDayAssignments(dayAssignments: DaySeating, guests: Guest[]): void {
  const guestMap = new Map<number, Guest>();
  guests.forEach(g => guestMap.set(g.id, g));
  
  const days: Day[] = ['woensdag', 'donderdag', 'vrijdag'];
  
  console.log('==== GUEST DAY ASSIGNMENT SUMMARY ====');
  
  for (const day of days) {
    console.log(`\nDay: ${day.toUpperCase()}`);
    const assignments = dayAssignments[day]?.seats || [];
    
    assignments.forEach(assignment => {
      const guest = guestMap.get(assignment.guestId);
      if (guest) {
        const isCorrectDay = guest.voorkeurDag1.toLowerCase() === day || guest.voorkeurDag2.toLowerCase() === day;
        console.log(
          `${guest.voornaam} ${guest.achternaam} (ID: ${guest.id}) - ` +
          `Preferences: Day1=${guest.voorkeurDag1}, Day2=${guest.voorkeurDag2} - ` +
          `Assigned to: ${day} - ` +
          `${isCorrectDay ? 'CORRECT' : 'WRONG DAY!!!'}`
        );
      }
    });
  }
  
  console.log('\n==== END SUMMARY ====');
}

// Add function to check if a teacher is being paired with themselves
function isValidTeacherPair(teacher1: Guest, teacher2: Guest): boolean {
  // Check if these are the same teacher (using id which is unique)
  if (teacher1.id === teacher2.id) {
    console.log(`Invalid teacher pair detected: ${teacher1.voornaam} cannot be paired with themselves`);
    return false;
  }
  return true;
}
