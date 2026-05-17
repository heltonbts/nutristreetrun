// @kingstinct/react-native-healthkit — NitroModules-based, New Architecture compatible
// iOS only; all exported functions are no-ops on Android / when unavailable
import type * as HKTypes from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

let HK: typeof HKTypes | null = null;

if (Platform.OS === 'ios') {
  try {
    HK = require('@kingstinct/react-native-healthkit') as typeof HKTypes;
  } catch {
    // package not linked — degrade gracefully
  }
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (!HK) return false;
  try {
    await HK.requestAuthorization({
      toRead: [
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierStepCount',
      ],
      toShare: ['HKWorkoutTypeIdentifier'],
    });
    return true;
  } catch {
    return false;
  }
}

export async function initHealthKit(): Promise<boolean> {
  return requestHealthKitPermissions();
}

export async function saveRunToHealth(params: {
  startedAt: Date;
  durationSeconds: number;
  distanceKm: number;
}): Promise<void> {
  if (!HK) return;
  try {
    const endDate = new Date(params.startedAt.getTime() + params.durationSeconds * 1000);
    await HK.saveWorkoutSample(HK.WorkoutActivityType.running, [], params.startedAt, endDate, {
      distance: params.distanceKm * 1000,
      energyBurned: Math.round(params.distanceKm * 70),
    });
  } catch {
    // silently fail — don't block saving the run
  }
}

export async function getLatestHeartRate(): Promise<number | null> {
  if (!HK) return null;
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 2 * 60 * 1000);
    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      filter: { date: { startDate: from, endDate: now } },
      limit: 1,
      ascending: false,
      unit: 'count/min',
    });
    if (!samples.length) return null;
    return Math.round(samples[0].quantity);
  } catch {
    return null;
  }
}

export async function getHeartRateStats(
  from: Date,
  to: Date,
): Promise<{ avg: number | null; max: number | null }> {
  if (!HK) return { avg: null, max: null };
  try {
    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      filter: { date: { startDate: from, endDate: to } },
      limit: -1,
      ascending: true,
      unit: 'count/min',
    });
    if (!samples.length) return { avg: null, max: null };
    const values = samples.map((s) => s.quantity);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const max = Math.round(Math.max(...values));
    return { avg, max };
  } catch {
    return { avg: null, max: null };
  }
}

export async function getCaloriesBurned(from: Date, to: Date): Promise<number> {
  if (!HK) return 0;
  try {
    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
      filter: { date: { startDate: from, endDate: to } },
      limit: -1,
      ascending: false,
      unit: 'kcal',
    });
    if (!samples.length) return 0;
    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0));
  } catch {
    return 0;
  }
}

/**
 * Estimativa client-side de calorias quando HealthKit não tem dados
 * (sem Apple Watch, sem permissão, ou iPhone sozinho — que não calcula
 * kcal de corrida automaticamente). Fórmula MET clássica:
 *
 *   kcal = MET × peso_kg × horas
 *
 * MET varia pelo pace (ACSM compendium aproximado):
 *   pace < 4'30"/km → 11.5 (forte)
 *   pace < 5'30"/km → 9.8  (moderada)
 *   pace < 7'00"/km → 8.3  (leve)
 *   pace < 9'00"/km → 7.0  (trote)
 *   senão            → 4.0  (caminhada)
 *
 * Use só como fallback — o valor do HealthKit (se houver) é sempre melhor.
 */
export function estimateCaloriesBurned(
  distanceKm: number,
  durationSec: number,
  weightKg: number | null,
): number {
  if (distanceKm <= 0 || durationSec <= 0) return 0;
  const paceSecPerKm = durationSec / distanceKm;
  let met: number;
  if (paceSecPerKm < 270) met = 11.5;
  else if (paceSecPerKm < 330) met = 9.8;
  else if (paceSecPerKm < 420) met = 8.3;
  else if (paceSecPerKm < 540) met = 7.0;
  else met = 4.0;
  const kg = weightKg && weightKg > 30 && weightKg < 250 ? weightKg : 70; // sanity
  const hours = durationSec / 3600;
  return Math.round(met * kg * hours);
}

export async function getStepCount(from: Date, to: Date): Promise<number> {
  if (!HK) return 0;
  try {
    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      filter: { date: { startDate: from, endDate: to } },
      limit: -1,
      ascending: false,
      unit: 'count',
    });
    if (!samples.length) return 0;
    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0));
  } catch {
    return 0;
  }
}
