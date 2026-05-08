import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, font } from '../../src/lib/tokens';

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={s.container}>
      <Text style={s.title}>PERFIL</Text>
      <Pressable style={s.btn} onPress={logout}>
        <Text style={s.btnText}>SAIR</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 24 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 48, color: colors.text },
  btn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  btnText: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: colors.danger, letterSpacing: 1 },
});
