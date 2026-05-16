import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK = 'nsr-run-tracker';
export const COORDS_KEY = 'nsr-run-coords';

export interface TrackedCoord {
  lat: number;
  lng: number;
  timestamp: number;
  alt?: number;
}

// Must be defined at module top-level, outside any component
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };

  try {
    const raw = await AsyncStorage.getItem(COORDS_KEY);
    const existing: TrackedCoord[] = raw ? (JSON.parse(raw) as TrackedCoord[]) : [];

    for (const loc of locations) {
      existing.push({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: loc.timestamp,
        alt: loc.coords.altitude ?? undefined,
      });
    }

    await AsyncStorage.setItem(COORDS_KEY, JSON.stringify(existing));
  } catch {
    // silently ignore storage errors — don't crash the background task
  }
});
