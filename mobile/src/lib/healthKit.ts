import { Platform } from 'react-native';

// react-native-health is iOS only. Install: npm install react-native-health + pod install

let AppleHealthKit: typeof import('react-native-health').default | null = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch {
    // package not installed — degrade gracefully
  }
}

const PERMISSIONS = () => ({
  permissions: {
    read: [
      AppleHealthKit!.Constants.Permissions.Workout,
      AppleHealthKit!.Constants.Permissions.HeartRate,
      AppleHealthKit!.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [AppleHealthKit!.Constants.Permissions.Workout],
  },
});

let _initialized = false;

export async function initHealthKit(): Promise<boolean> {
  if (!AppleHealthKit) return false;
  if (_initialized) return true;

  return new Promise((resolve) => {
    AppleHealthKit!.initHealthKit(PERMISSIONS(), (err) => {
      if (!err) _initialized = true;
      resolve(!err);
    });
  });
}

// Force re-request permissions (for the "Connect Apple Health" button)
export async function requestHealthKitPermissions(): Promise<boolean> {
  if (!AppleHealthKit) return false;
  _initialized = false;
  return initHealthKit();
}

export async function saveRunToHealth(params: {
  startedAt: Date;
  durationSeconds: number;
  distanceKm: number;
}): Promise<void> {
  if (!AppleHealthKit) return;
  const ok = await initHealthKit();
  if (!ok) return;

  const endDate = new Date(params.startedAt.getTime() + params.durationSeconds * 1000);

  return new Promise((resolve) => {
    // react-native-health types are incomplete — distance/energy are supported at runtime

    AppleHealthKit!.saveWorkout(
      {
        type: AppleHealthKit!.Constants.Activities.Running,
        startDate: params.startedAt.toISOString(),
        endDate: endDate.toISOString(),
        distance: params.distanceKm,
        distanceUnit: 'kilometer',
        energyBurned: Math.round(params.distanceKm * 70),
        energyBurnedUnit: 'calorie',
      } as any,
      () => resolve(),
    );
  });
}

// Latest HR sample in the last 2 minutes — for real-time display during run
export async function getLatestHeartRate(): Promise<number | null> {
  if (!AppleHealthKit) return null;
  const ok = await initHealthKit();
  if (!ok) return null;

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 60 * 1000);

  return new Promise((resolve) => {
    AppleHealthKit!.getHeartRateSamples(
      { startDate: from.toISOString(), endDate: now.toISOString(), ascending: false, limit: 1 },
      (err, results) => {
        if (err || !results?.length) {
          resolve(null);
          return;
        }
        resolve(Math.round(results[0].value));
      },
    );
  });
}

// Avg + max HR for the workout duration — called after finishing
export async function getHeartRateStats(
  from: Date,
  to: Date,
): Promise<{ avg: number | null; max: number | null }> {
  if (!AppleHealthKit) return { avg: null, max: null };
  const ok = await initHealthKit();
  if (!ok) return { avg: null, max: null };

  return new Promise((resolve) => {
    AppleHealthKit!.getHeartRateSamples(
      { startDate: from.toISOString(), endDate: to.toISOString(), ascending: true },
      (err, results) => {
        if (err || !results?.length) {
          resolve({ avg: null, max: null });
          return;
        }
        const values = results.map((r) => r.value);
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const max = Math.round(Math.max(...values));
        resolve({ avg, max });
      },
    );
  });
}

// Active energy burned from Apple Watch for the workout duration
export async function getCaloriesBurned(from: Date, to: Date): Promise<number> {
  if (!AppleHealthKit) return 0;
  const ok = await initHealthKit();
  if (!ok) return 0;

  return new Promise((resolve) => {
    AppleHealthKit!.getActiveEnergyBurned(
      { startDate: from.toISOString(), endDate: to.toISOString(), ascending: false },
      (err, results) => {
        if (err || !results?.length) {
          resolve(0);
          return;
        }
        resolve(Math.round(results.reduce((sum, r) => sum + r.value, 0)));
      },
    );
  });
}
