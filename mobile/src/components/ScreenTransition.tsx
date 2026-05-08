import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../lib/tokens';

interface Props {
  children: React.ReactNode;
  distance?: number;
  duration?: number;
}

export function ScreenTransition({ children, distance = 10, duration = 220 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(distance);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }, []),
  );

  return (
    <Animated.View style={[s.fill, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );

}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
});
