import Dexie, { type Table } from 'dexie';
import { WatchlistItem, RestaurantItem } from './types';

export class CozyDB extends Dexie {
  watchlist!: Table<WatchlistItem>;
  restaurants!: Table<RestaurantItem>;

  constructor() {
    super('CozyTrackerDB');
    this.version(1).stores({
      watchlist: '++id, title, type, status, genre, releaseYear, createdAt',
      restaurants: '++id, name, cuisine, type, visited, createdAt'
    });
  }
}

export const db = new CozyDB();

// Function to populate initial mock data (now removed/cleared to let the user start empty)
export async function seedDatabase(force = false) {
  // We want the user's database to start completely fresh with no preloaded records.
  // Therefore, this is now a safe no-op.
  if (force) {
    await db.watchlist.clear();
    await db.restaurants.clear();
  }
}
