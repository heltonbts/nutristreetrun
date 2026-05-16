// Live Activities — placeholder para implementação futura
// expo-live-activity incompatível com expo-modules-core do SDK 54
// Implementar via Widget Extension nativa quando atualizar para SDK 55+

export function startRunActivity(
  _distanceKm: number,
  _elapsedSeconds: number,
  _paceSec: number,
  _kmProgress = 0,
) {}
export function updateRunActivity(
  _distanceKm: number,
  _elapsedSeconds: number,
  _paceSec: number,
  _kmProgress = 0,
) {}
export function endRunActivity() {}
