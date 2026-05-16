import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { colors } from '../lib/tokens';

interface Props {
  children: React.ReactNode;
  duration?: number;
}

// Entrada leve ao focar a tela: fade + um scale-up sutil (0.985 → 1).
// Substitui o translateY antigo (que fazia o conteúdo "pular"); o scale
// combina melhor com o spring do pill da tab bar e não desloca o layout.
export function ScreenTransition({ children, duration = 190 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      scale.setValue(0.985);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: duration + 70,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, []),
  );

  return (
    <Animated.View style={[s.fill, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
});
