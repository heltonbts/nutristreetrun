import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFullscreenRoute } from '../lib/navRoutes';
import { colors, font } from '../lib/tokens';
import { TabIcon } from './TabIcon';

const BAR_INSET = 24; // left/right do wrapper
const BAR_HEIGHT = 68;
const PILL = 44;
const SCREEN_W = Dimensions.get('window').width;

type TabName = 'home' | 'ranking' | 'feed' | 'runs' | 'profile';

const ROUTE_MAP: Record<string, { icon: TabName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  ranking: { icon: 'ranking', label: 'Ranking' },
  feed: { icon: 'feed', label: 'Feed' },
  runs: { icon: 'runs', label: 'Corridas' },
  profile: { icon: 'profile', label: 'Perfil' },
};

export function FloatingTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const barBottom = Math.max(insets.bottom, 8) + 8;

  // Posição do pill deslizante: cada aba ocupa um slot de largura igual.
  const slot = (SCREEN_W - BAR_INSET * 2) / state.routes.length;
  const pillX = (i: number) => i * slot + (slot - PILL) / 2;
  const indicatorX = useRef(new Animated.Value(pillX(state.index))).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: pillX(state.index),
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
    // pillX depende só de slot (constante por render) — index é o gatilho real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, slot]);

  // Esconde a tab bar nas telas full-screen empilhadas (não na raiz da aba),
  // onde a barra flutuante atrapalharia o conteúdo (detalhe, gráficos, tracker).
  const currentTabRoute = state.routes[state.index];
  const nestedRoutes = currentTabRoute.state?.routes;
  const nestedIndex = currentTabRoute.state?.index ?? 0;
  const currentNestedRoute = nestedRoutes?.[nestedIndex];
  if (isFullscreenRoute(currentNestedRoute?.name)) return null;

  return (
    <View style={[s.wrapper, { bottom: barBottom }]}>
      {/* Glass layers */}
      <View style={[StyleSheet.absoluteFill, s.glassDark]} />
      <View style={[StyleSheet.absoluteFill, s.glassTint]} />
      <View style={s.glassHighlight} />
      <View style={[StyleSheet.absoluteFill, s.glassBorder]} />

      {/* Pill deslizante — destaque único que faz spring entre as abas */}
      <Animated.View
        pointerEvents="none"
        style={[s.pill, { transform: [{ translateX: indicatorX }] }]}
      />

      {/* Tab items */}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = ROUTE_MAP[route.name];
        if (!meta) return null;

        const activeColor = colors.brand;
        const inactiveColor = 'rgba(236,239,238,0.38)';
        const color = focused ? activeColor : inactiveColor;

        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [s.item, pressed && { transform: [{ scale: 0.86 }] }]}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <TabIcon name={meta.icon} color={color} focused={focused} />
            <Text style={[s.label, { color }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 68,
    borderRadius: 36,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 24,
  },
  glassDark: {
    backgroundColor: 'rgba(14,18,17,0.82)',
    borderRadius: 36,
  },
  glassTint: {
    backgroundColor: 'rgba(95,184,168,0.04)',
    borderRadius: 36,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pill: {
    position: 'absolute',
    width: PILL,
    height: PILL,
    top: (BAR_HEIGHT - PILL) / 2,
    left: 0,
    borderRadius: PILL / 2,
    backgroundColor: `${colors.brand}22`,
    borderWidth: 0.5,
    borderColor: `${colors.brand}55`,
  },
  glassBorder: {
    borderRadius: 36,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontFamily: font.bodyBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
