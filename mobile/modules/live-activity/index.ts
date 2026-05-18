import { requireOptionalNativeModule } from 'expo';

// Módulo nativo bruto (ActivityKit). `requireOptionalNativeModule` devolve
// null em Expo Go, Android, ou quando o módulo não está linkado — a fachada
// em src/lib/liveActivity.ts trata isso. iOS < 16.1 retorna isSupported=false.
export interface LiveActivityNativeModule {
  isSupported(): boolean;
  startActivity(
    distanceKm: number,
    paceSec: number,
    durationSec: number,
    calories: number,
    kmProgress: number,
  ): void;
  updateActivity(
    distanceKm: number,
    paceSec: number,
    durationSec: number,
    calories: number,
    kmProgress: number,
  ): void;
  endActivity(): void;
}

export default requireOptionalNativeModule<LiveActivityNativeModule>('LiveActivity');
