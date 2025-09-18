import { db } from './redisClient';

export async function getLastId(): Promise<number> {
  try {
    // Get both lastId and guests
    const [lastIdStr, guestsStr] = await Promise.all([
      db.get('lastId'),
      db.get('guests')
    ]);

    const lastId = lastIdStr ? parseInt(lastIdStr, 10) : 0;
    const guests = guestsStr ? JSON.parse(guestsStr) : [];
    
    // Find the highest ID from the existing guests
    const highestExistingId = guests.reduce((max: number, guest: any) => 
      guest.id > max ? guest.id : max, 0);
    
    // Return the higher of lastId or highestExistingId
    const actualLastId = Math.max(lastId, highestExistingId);
    
    // Update lastId if it's out of sync
    if (actualLastId > lastId) {
      await db.set('lastId', actualLastId.toString());
    }

    return actualLastId;
  } catch (error) {
    console.error('Error getting last ID:', error);
    return 0;
  }
}
