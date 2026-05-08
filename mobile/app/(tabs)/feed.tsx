import { StyleSheet, Text, View } from 'react-native';
import { ScreenTransition } from '../../src/components/ScreenTransition';
import { colors } from '../../src/lib/tokens';

export default function FeedScreen() {
  return (
    <ScreenTransition>
      <View style={s.container}>
        <Text style={s.title}>FEED</Text>
      </View>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 48, color: colors.text },
});
