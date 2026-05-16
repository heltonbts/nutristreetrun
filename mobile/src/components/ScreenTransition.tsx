import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { colors } from '../lib/tokens';

interface Props {
  children: React.ReactNode;
  duration?: number;
}

// Entrada leve (fade + scale-up sutil) UMA vez na montagem.
// Antes rodava no useFocusEffect e re-animava a cada foco — com o pager
// nativo (swipe/tap entre abas) isso causava uma piscada por cima do slide.
// O pager já é a transição entre abas; aqui é só o primeiro paint.
export function ScreenTransition({ children, duration = 190 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  useEffect(() => {
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
    // refs são estáveis; só queremos rodar na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[s.fill, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
});
