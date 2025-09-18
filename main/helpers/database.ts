// Plaats dit bovenaan main/helpers/database.ts (vervang het oude redis-config block)
import path from 'path';
import dotenv from 'dotenv';

// Laad .env.local automatisch (development)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Redis, RedisOptions } from 'ioredis';
import { getLastId } from './getLastId';
import { zaalIndeling } from './zaalIndeling';

// Kies config: indien REDIS_URL aanwezig gebruik die (kan rediss:// zijn),
// anders bouw options met host/port/username/password en optionele TLS.
const useTls = (process.env.REDIS_TLS || '').toLowerCase() === 'true';
const redisUrl = process.env.REDIS_URL && process.env.REDIS_URL.trim().length > 0 ? process.env.REDIS_URL.trim() : null;

const commonRedisOptions: RedisOptions = {
  lazyConnect: true,
  connectTimeout: 5000, // 5s
  retryStrategy: (times: number) => {
    if (times > 3) return null; // stop retrying after 3 attempts
    return Math.min(times * 50, 2000);
  },
};

// Build options only if we don't have a URL
const redisOptions: RedisOptions | undefined = redisUrl ? undefined : {
  ...commonRedisOptions,
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || '',
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ...(useTls ? { tls: {} } : {})
};

// Instantiate Redis client (string URL preferred when provided)
const redis: Redis = redisUrl ? new Redis(redisUrl) : new Redis(redisOptions!);

redis.on('error', (err: any) => console.error('Redis Client Error', err));
redis.on('connect', () => console.log('Connected to Redis'));

// Add offline mode support
let isOfflineMode = false;
const offlineCache: Cache = {
  guests: [] as any[],
  seats: {},
  settings: null,
  dayAssignments: null,
};

// Ensure guests is always an array
offlineCache.guests = offlineCache.guests || [];

// Add a function to ensure connection
async function ensureConnection(): Promise<boolean> {
  if (isOfflineMode) return false;
  
  try {
    if (redis.status === 'wait' || redis.status === 'close' || redis.status === 'end') {
      await redis.connect();
      await redis.ping();
    } else if (redis.status === 'ready') {
      await redis.ping(); // Test if connection is still alive
    }
    isOfflineMode = false;
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    isOfflineMode = true;
    return false;
  }
}

// Modified connect function to handle connection state and return boolean
async function connect(): Promise<boolean> {
  try {
    const connected = await ensureConnection();
    if (!connected) {
      console.log('Switching to offline mode');
      isOfflineMode = true;
    }
    return connected;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    isOfflineMode = true;
    return false;
  }
}

// Add type definition for cache
type Cache = {
  guests: any[] | null;
  seats: Record<string, any>;
  settings: any | null;
  dayAssignments: any | null;
  [key: string]: any; // Add index signature
};

// Initialize cache with type
const cache: Cache = {
  guests: null,
  seats: {},
  settings: null,
  dayAssignments: null,
};

// Modify getGuests to use cache
async function getGuests() {
  if (isOfflineMode) {
    return offlineCache.guests;
  }
  if (cache.guests) return cache.guests;
  try {
    const guests = await redis.get('guests');
    const parsedGuests = guests ? JSON.parse(guests) : [];
    cache.guests = parsedGuests;
    return parsedGuests;
  } catch (error) {
    console.error('Error fetching guests:', error);
    throw new Error('Failed to fetch guests from database');
  }
}

async function addGuest(guestData: any): Promise<any> {
  if (isOfflineMode) {
    if (!offlineCache.guests) offlineCache.guests = [];
    const highestExistingId = offlineCache.guests.reduce(
      (max: number, guest: any) => (guest.id > max ? guest.id : max),
      0
    );
    guestData.id = highestExistingId + 1;
    offlineCache.guests.push(guestData);
    return guestData;
  }
  try {
    const guests = await getGuests();
    const highestExistingId = guests.reduce(
      (max: number, guest: any) => (guest.id > max ? guest.id : max),
      0
    );

    guestData.id = highestExistingId + 1;
    guests.push(guestData);

    await redis.set('lastId', guestData.id.toString());
    await redis.set('guests', JSON.stringify(guests));
    invalidateCache('guests');
    return guestData;
  } catch (error) {
    console.error('Error adding guest:', error);
    throw error;
  }
}

// Modified addGuestsBulk to use a single connection
async function addGuestsBulk(guestsData: any[]): Promise<any[]> {
  try {
    await connect(); // Ensure connection only if needed
    const guests = await getGuests();

    // Get the highest ID from existing guests
    const highestExistingId = guests.reduce(
      (max: number, guest: any) => (guest.id > max ? guest.id : max),
      0
    );

    // Start new IDs after the highest existing ID
    const guestsWithIds = guestsData.map((guest, index) => ({
      ...guest,
      id: highestExistingId + index + 1,
    }));

    // Update lastId to the highest new ID
    await redis.set('lastId', (highestExistingId + guestsData.length).toString());

    guests.push(...guestsWithIds);
    await redis.set('guests', JSON.stringify(guests));
    return guestsWithIds;
  } catch (error) {
    console.error('Error bulk adding guests:', error);
    throw error;
  }
}

// Add interface for Seat
interface Seat {
  stoel: number;
  guest: Guest | null;
  priority: number;
  together?: boolean;
}

// Add type for Row
type Row = Seat[];

// Update the function with proper type annotations
async function addSeat(guest: Guest, row: string, seatNumber: number): Promise<void> {
  try {
    const seats = JSON.parse((await redis.get('seats')) || '{}');
    if (!seats[row]) {
      seats[row] = [];
    }
    seats[row].push({ stoel: seatNumber, guest });
    await redis.set('seats', JSON.stringify(seats));
  } catch (error) {
    console.error('Error adding seat:', error);
    throw error;
  }
}

async function getSeats() {
  try {
    const seats = await redis.get('seats');
    return seats ? JSON.parse(seats) : {};
  } catch (error) {
    console.error('Error fetching seats:', error);
    throw error;
  }
}

// Update deleteGuest to handle all assignments
async function deleteGuest(guestId: number): Promise<void> {
  try {
    // Delete from guests list
    const guests = await getGuests();
    const updatedGuests = guests.filter((guest: any) => guest.id !== guestId);
    await redis.set('guests', JSON.stringify(updatedGuests));

    // Delete from all day assignments
    const days: Day[] = ['woensdag', 'donderdag', 'vrijdag'];
    const assignments = await getDayAssignments();

    for (const day of days) {
      // Remove guest from day's seating
      const seating = await getSeatsForDay(day);
      seating.forEach((row: Row) => {
        row.forEach((seat: Seat) => {
          if (seat.guest?.id === guestId) {
            seat.guest = null;
            seat.together = false;
          }
        });
      });
      await setSeatsForDay(day, seating);

      // Update day assignments
      if (assignments[day]) {
        const guestAssignment = assignments[day].seats.find((s) => s.guestId === guestId);
        if (guestAssignment) {
          assignments[day].assigned -= guestAssignment.seats;
          assignments[day].seats = assignments[day].seats.filter((s) => s.guestId !== guestId);
        }
      }
    }

    await updateDayAssignments(assignments);
    invalidateCache();
  } catch (error) {
    console.error('Error deleting guest:', error);
    throw error;
  }
}

async function deleteAllUsers(): Promise<void> {
  try {
    console.log('Starting deleteAllUsers...');

    // First, clear all existing data
    const keys = await redis.keys('seats:*');
    console.log('Found keys to delete:', keys);

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    // Reset seating status
    await setSeatingStatus(false);

    // Initialize empty matrix
    const emptyMatrix = Object.keys(zaalIndeling.rijen).map((rowNum) => {
      const row = zaalIndeling.rijen[parseInt(rowNum)];
      return Array(row.maxStoelen)
        .fill(null)
        .map((_, idx) => ({
          stoel: idx + 1,
          guest: null,
          priority: 1,
          together: false,
        }));
    });

    console.log('Setting new empty data...');

    // Use separate SET commands to ensure atomicity
    await redis.set('guests', '[]');
    await redis.set('lastId', '0');
    await redis.set('seats:woensdag', JSON.stringify(emptyMatrix));
    await redis.set('seats:donderdag', JSON.stringify(emptyMatrix));
    await redis.set('seats:vrijdag', JSON.stringify(emptyMatrix));
    await redis.set(
      'dayAssignments',
      JSON.stringify({
        woensdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
        donderdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
        vrijdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
      })
    );

    // Clear all caches
    cache.guests = null;
    cache.seats = {};
    cache.settings = null;
    cache.dayAssignments = null;

    console.log('Verifying deletion...');
    const verification = await Promise.all([
      redis.get('guests'),
      redis.get('seats:woensdag'),
      redis.get('seats:donderdag'),
      redis.get('seats:vrijdag'),
      redis.get('dayAssignments'),
    ]);
    console.log('Verification results:', {
      guests: verification[0],
      woensdag: verification[1]
        ? JSON.parse(verification[1]).some((row: any) => row.some((seat: any) => seat.guest))
        : null,
      donderdag: verification[2]
        ? JSON.parse(verification[2]).some((row: any) => row.some((seat: any) => seat.guest))
        : null,
      vrijdag: verification[3]
        ? JSON.parse(verification[3]).some((row: any) => row.some((seat: any) => seat.guest))
        : null,
      assignments: verification[4],
    });

    await setSeatingStatus(true);
    console.log('DeleteAllUsers completed');
  } catch (error) {
    console.error('Error in deleteAllUsers:', error);
    throw error;
  }
}

type Day = 'woensdag' | 'donderdag' | 'vrijdag';

interface DaySeating {
  [day: string]: {
    seats: any[];
    capacity: number;
    assigned: number;
  };
}

// Calculate total capacity from zaalIndeling
function calculateTotalCapacity(): number {
  return Object.values(zaalIndeling.rijen).reduce((total, row) => {
    return total + row.maxStoelen;
  }, 0);
}

const TOTAL_CAPACITY = calculateTotalCapacity();

// Modify getSeatsForDay to use cache
async function getSeatsForDay(day: Day) {
  try {
    const seats = await redis.get(`seats:${day}`);
    const cachedSeats = cache.seats[day];

    // Clear the cache for this day to ensure fresh data
    cache.seats[day] = null;

    if (!seats) {
      // Initialize with empty array structure
      const emptyMatrix = Object.keys(zaalIndeling.rijen).map((rowNum) => {
        const row = zaalIndeling.rijen[parseInt(rowNum)];
        const rowSeats = Array(row.maxStoelen)
          .fill(null)
          .map((_, idx) => ({
            stoel: idx + 1,
            guest: null,
            priority: 1,
          }));
        return rowSeats; // Return just the array of seats
      });
      await redis.set(`seats:${day}`, JSON.stringify(emptyMatrix));
      cache.seats[day] = emptyMatrix;
      return emptyMatrix;
    }

    const parsedSeats = JSON.parse(seats);
    cache.seats[day] = parsedSeats;
    return parsedSeats;
  } catch (error) {
    console.error(`Error in getSeatsForDay for ${day}:`, error);
    throw error;
  }
}

async function setSeatsForDay(day: Day, seating: any) {
  try {
    await redis.set(`seats:${day}`, JSON.stringify(seating));
  } catch (error) {
    console.error(`Error setting seats for ${day}:`, error);
    throw error;
  }
}

async function getDayAssignments(): Promise<DaySeating> {
  try {
    const assignments = await redis.get('dayAssignments');
    return assignments
      ? JSON.parse(assignments)
      : {
          woensdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
          donderdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
          vrijdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
        };
  } catch (error) {
    console.error('Error fetching day assignments:', error);
    throw error;
  }
}
console.error("you suckkkkk");
async function updateDayAssignments(assignments: DaySeating) {
  try {
    await redis.set('dayAssignments', JSON.stringify(assignments));
  } catch (error) {
    console.error('Error updating day assignments:', error);
    throw error;
  }
}

async function resetSeatingAndAssignments(): Promise<void> {
  try {
    // Initialize each day's seating matrix - store only the seat arrays
    const emptyMatrix = Object.keys(zaalIndeling.rijen).map((rowNum) => {
      const row = zaalIndeling.rijen[parseInt(rowNum)];
      return Array(row.maxStoelen)
        .fill(null)
        .map((_, idx) => ({
          stoel: idx + 1,
          guest: null,
          priority: 1,
        }));
    });

    const defaultAssignments = {
      woensdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
      donderdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
      vrijdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
    };

    await Promise.all([
      redis.set('seats:woensdag', JSON.stringify(emptyMatrix)),
      redis.set('seats:donderdag', JSON.stringify(emptyMatrix)),
      redis.set('seats:vrijdag', JSON.stringify(emptyMatrix)),
      redis.set('dayAssignments', JSON.stringify(defaultAssignments)),
    ]);

    console.log(`Reset seating with total capacity of ${TOTAL_CAPACITY} seats per day`);
  } catch (error) {
    console.error('Error resetting seating assignments:', error);
    throw error;
  }
}

// Fix invalidateCache function
function invalidateCache(key?: string) {
  if (key) {
    if (key === 'seats') {
      cache.seats = {};
    } else if (key in cache) {
      // Type-safe check
      cache[key] = null;
    }
  } else {
    cache.guests = null;
    cache.seats = {};
    cache.settings = null;
    cache.dayAssignments = null;
  }
}

// Add Guest interface
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
  email: string;
  id: number;
  leerlingnummer: number;
  IoVivat: boolean;
}

// Add SeatingStatus interface
interface SeatingStatus {
  isDone: boolean;
  lastUpdated: string;
  estimatedTimeMs?: number;
  startTime?: string;
  guestsToProcess?: number;
  processedGuests?: number;
}

async function setSeatingStatus(isDone: boolean, extraData?: Partial<SeatingStatus>) {
  try {
    const status: SeatingStatus = {
      isDone,
      lastUpdated: new Date().toISOString(),
      ...extraData,
    };
    await redis.set('seatingStatus', JSON.stringify(status));
  } catch (error) {
    console.error('Error setting seating status:', error);
    throw error;
  }
}

// Update getSeatingStatus to use offline mode and connection checking
async function getSeatingStatus(): Promise<SeatingStatus> {
  if (isOfflineMode) {
    return { isDone: true, lastUpdated: new Date().toISOString() };
  }

  try {
    await ensureConnection();
    const status = await redis.get('seatingStatus');
    return status ? JSON.parse(status) : { isDone: true, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error('Error getting seating status:', error);
    // Return a default status instead of throwing
    return { isDone: true, lastUpdated: new Date().toISOString() };
  }
}

// Update your settings interface
interface Settings {
  // ... existing settings ...
  ereleden: string[];
  meespelend: string[];
  meespelendLeerlingen: string[];
  teacherPreferenceWeight: number; // Add weight for teacher preferences
  allowRegularToVIPPreference: boolean; // Allow regular guests to have VIP preferences
  requireMutualPreference: boolean; // Require mutual preference for seating
}

// Initialize with default values
const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  ereleden: [],
  meespelend: [],
  meespelendLeerlingen: [],
  teacherPreferenceWeight: 1.5, // Teachers get 50% higher priority for sitting together
  allowRegularToVIPPreference: false,
  requireMutualPreference: false
};

// Update getSettings to include new fields
async function getSettings(): Promise<Settings> {
  try {
    const settingsStr = await redis.get('settings');
    return settingsStr ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsStr) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Add BlockedSeat interface
interface BlockedSeat {
  day: string;
  row: number;
  seatNumber: number;
  reason?: string;
}

// Add function to get blocked seats
async function getBlockedSeats(day?: string): Promise<BlockedSeat[]> {
  try {
    const blockedSeatsStr = await redis.get('blockedSeats');
    if (!blockedSeatsStr) return [];
    
    const blockedSeats = JSON.parse(blockedSeatsStr) as BlockedSeat[];
    
    // If day is specified, filter by day
    if (day) {
      return blockedSeats.filter(seat => seat.day === day);
    }
    
    return blockedSeats;
  } catch (error) {
    console.error('Error getting blocked seats:', error);
    return [];
  }
}

// Add function to block a seat
async function blockSeat(blockedSeat: BlockedSeat): Promise<boolean> {
  try {
    const blockedSeats = await getBlockedSeats();
    
    // Check if seat is already blocked
    const existingSeatIndex = blockedSeats.findIndex(
      s => s.day === blockedSeat.day && 
           s.row === blockedSeat.row && 
           s.seatNumber === blockedSeat.seatNumber
    );
    
    if (existingSeatIndex !== -1) {
      // Update existing entry
      blockedSeats[existingSeatIndex] = blockedSeat;
    } else {
      // Add new entry
      blockedSeats.push(blockedSeat);
    }
    
    await redis.set('blockedSeats', JSON.stringify(blockedSeats));
    return true;
  } catch (error) {
    console.error('Error blocking seat:', error);
    return false;
  }
}

// Add function to unblock a seat
async function unblockSeat(day: string, row: number, seatNumber: number): Promise<boolean> {
  try {
    const blockedSeats = await getBlockedSeats();
    
    const filteredSeats = blockedSeats.filter(
      seat => !(seat.day === day && seat.row === row && seat.seatNumber === seatNumber)
    );
    
    await redis.set('blockedSeats', JSON.stringify(filteredSeats));
    return true;
  } catch (error) {
    console.error('Error unblocking seat:', error);
    return false;
  }
}

// Add function to unblock all seats
async function unblockAllSeats(): Promise<boolean> {
  try {
    await redis.set('blockedSeats', JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error unblocking all seats:', error);
    return false;
  }
}

// Interface for algorithm logs
export interface AlgorithmLog {
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  details?: any;
  guestId?: number;
  guestName?: string;
  phase?: 'initialization' | 'seating' | 'optimization';
  day?: string;
}

// Use Redis keys with patterns for logs instead of collections
const ALGORITHM_LOGS_KEY_PREFIX = 'algorithm:logs:';
const ALGORITHM_LOGS_INDEX_KEY = 'algorithm:logs:index';

// Log algorithm activity
export const logAlgorithm = async (logData: AlgorithmLog) => {
  try {
    // Add timestamp if not provided
    if (!logData.timestamp) {
      logData.timestamp = new Date().toISOString();
    }
    
    // Generate a unique ID for this log entry
    const logId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const key = `${ALGORITHM_LOGS_KEY_PREFIX}${logId}`;
    
    // Store the log as JSON in Redis
    await redis.set(key, JSON.stringify(logData));
    
    // Add to a sorted set for timestamp-based retrieval
    await redis.zadd(ALGORITHM_LOGS_INDEX_KEY, 
                    new Date(logData.timestamp).getTime(), // Score (timestamp as number)
                    key); // Member (the key of the log)
  } catch (error) {
    console.error("Error logging algorithm activity:", error);
  }
};

// Get algorithm logs
export const getAlgorithmLogs = async () => {
  try {
    // Get all keys from the sorted set (newest first)
    const logKeys = await redis.zrevrange(ALGORITHM_LOGS_INDEX_KEY, 0, -1);
    
    if (!logKeys || logKeys.length === 0) {
      return [];
    }
    
    // Get all logs from Redis
    const logPromises = logKeys.map(async (key: string) => {
      const logData = await redis.get(key);
      if (!logData) return null;
      try {
        return JSON.parse(logData);
      } catch (e) {
        console.error("Error parsing log data:", e);
        return null;
      }
    });
    
    // Wait for all promises and filter out null values
    const logs = (await Promise.all(logPromises)).filter((log: any) => log !== null);
    return logs;
  } catch (error) {
    console.error("Error retrieving algorithm logs:", error);
    return [];
  }
};

export {
  getGuests,
  addGuest,
  addGuestsBulk,
  addSeat,
  getSeats,
  connect,
  redis as db,
  deleteGuest,
  deleteAllUsers,
  getSeatsForDay,
  setSeatsForDay,
  getDayAssignments,
  updateDayAssignments,
  resetSeatingAndAssignments,
  TOTAL_CAPACITY,
  type Day,
  type DaySeating,
  type Guest,
  setSeatingStatus,
  getSeatingStatus,
  type SeatingStatus,
  getSettings,
  type Settings,
  getBlockedSeats,
  blockSeat,
  unblockSeat,
  unblockAllSeats,
  type BlockedSeat
};
