export interface WatchlistItem {
  id?: number;
  title: string;
  type: 'Movie' | 'Series';
  releaseYear?: number;
  genre: string;
  country: string;
  status: 'Watched' | 'Unwatched';
  rating?: number; // 1-5 float representation
  verdict?: string; // Quick verdict tags: e.g. "Must Watch", "Decent", etc.
  review?: string; // Freeform written review
  createdAt: number;
  director?: string; // Optional director name
  actors?: string; // Optional actors list
  image?: string; // Base64 movie/series poster image
}

export interface RestaurantItem {
  id?: number;
  name: string;
  cuisine: string;
  type: string; // e.g. "Local Spot", "Fine Dining", etc.
  visited: boolean;
  rating?: number; // 1-5 float representation
  verdict?: string; // Quick verdict tags: "Amazing", "Average", "Never Again"
  remarks?: string; // Private remarks and notes
  image?: string; // Base64 compressed image representation
  createdAt: number;
}

export interface UserProfile {
  username: string;
  hasOnboarded: boolean;
}
