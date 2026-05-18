// Fachada da Live Activity. Liga ao módulo nativo local (ActivityKit).
// Degrada pra no-op com segurança: Expo Go / Android / módulo não-linkado
// → `LiveActivity` é null (optional chaining). iOS < 16.1 → o nativo faz
// guard interno (areActivitiesEnabled = false). try/catch cobre o resto.
//
// Assinaturas mantidas compatíveis com o que o tracker já chama; `calories`
// foi adicionado como último arg opcional.
import LiveActivity from '../../modules/live-activity';

export function liveActivitySupported(): boolean {
  try {
    return LiveActivity?.isSupported() ?? false;
  } catch {
    return false;
  }
}

export function startRunActivity(
  distanceKm: number,
  elapsedSeconds: number,
  paceSec: number,
  kmProgress = 0,
  calories = 0,
) {
  try {
    LiveActivity?.startActivity(
      distanceKm,
      paceSec,
      Math.round(elapsedSeconds),
      Math.round(calories),
      kmProgress,
    );
  } catch {
    // nativo indisponível — ignora
  }
}

export function updateRunActivity(
  distanceKm: number,
  elapsedSeconds: number,
  paceSec: number,
  kmProgress = 0,
  calories = 0,
) {
  try {
    LiveActivity?.updateActivity(
      distanceKm,
      paceSec,
      Math.round(elapsedSeconds),
      Math.round(calories),
      kmProgress,
    );
  } catch {
    // nativo indisponível — ignora
  }
}

export function endRunActivity() {
  try {
    LiveActivity?.endActivity();
  } catch {
    // nativo indisponível — ignora
  }
}
