import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenTransition } from '../../src/components/ScreenTransition';
import { colors, font } from '../../src/lib/tokens';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScreenTransition>
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={s.kicker}>COMUNIDADE</Text>
          <Text style={s.title}>FEED</Text>
        </View>

        <View style={s.center}>
          <View style={s.iconWrap}>
            <Text style={s.icon}>👥</Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillText}>EM BREVE</Text>
          </View>
          <Text style={s.heading}>Feed da comunidade</Text>
          <Text style={s.desc}>
            Veja o que sua assessoria e seus pares estão fazendo. Em breve nesta tela.
          </Text>
        </View>
      </View>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2 },
  title: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 44,
    color: colors.text, lineHeight: 46, letterSpacing: 0.5, marginTop: 4,
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 14, marginBottom: 60,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(95,184,168,0.10)',
    borderWidth: 1, borderColor: 'rgba(95,184,168,0.22)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  icon: { fontSize: 32 },
  pill: {
    backgroundColor: 'rgba(95,184,168,0.12)', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(95,184,168,0.28)',
    paddingHorizontal: 12, paddingVertical: 4,
  },
  pillText: { fontFamily: font.bodyBold, fontSize: 10, color: colors.brand, letterSpacing: 1.4 },
  heading: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 24,
    color: colors.text, letterSpacing: 0.5, textAlign: 'center',
  },
  desc: {
    fontFamily: font.body, fontSize: 13, color: colors.textMute,
    textAlign: 'center', lineHeight: 20,
  },
});
