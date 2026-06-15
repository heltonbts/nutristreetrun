import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '../lib/tokens';

/** Iniciais a partir do nome (1ª + última palavra). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar circular com fallback de iniciais. Compartilhado entre perfil,
 * listas de conexões e grid. (O feed mantém o seu próprio por enquanto.)
 */
export function Avatar({
  name,
  avatarUrl,
  size = 40,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const radius = size / 2;
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <View
      style={[s.fallback, { width: size, height: size, borderRadius: radius }]}
    >
      <Text style={[s.initials, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(95,184,168,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: font.bodyBold, color: colors.brand },
});
