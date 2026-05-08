import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/lib/tokens';

export default function RankingScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>RANKING</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 48, color: colors.text },
});
