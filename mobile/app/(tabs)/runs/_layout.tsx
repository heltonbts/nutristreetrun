import { Stack } from 'expo-router';

import { colors } from '../../../src/lib/tokens';

export default function RunsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
