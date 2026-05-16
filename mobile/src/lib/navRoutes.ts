// Telas full-screen empilhadas dentro de uma aba (stack de runs).
// Nelas: a tab bar flutuante some E o swipe entre abas é desligado —
// o gesto horizontal conflita com o mapa do tracker e os scrolls.
// Nome = nome do arquivo da rota no expo-router (runs/[id].tsx → '[id]').
export const FULLSCREEN_ROUTES = ['tracker', '[id]', 'charts'];

export function isFullscreenRoute(name: string | undefined | null): boolean {
  return !!name && FULLSCREEN_ROUTES.includes(name);
}
