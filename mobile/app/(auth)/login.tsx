import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, font } from '../../src/lib/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch {
      setError('E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.header}>
        <Text style={s.kicker}>BEM-VINDO DE VOLTA</Text>
        <Text style={s.title}>NUTRISTREET{'\n'}RUN</Text>
      </View>

      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textMute}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Senha"
          placeholderTextColor={colors.textMute}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color={colors.brandInk} />
            : <Text style={s.btnText}>ENTRAR</Text>
          }
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable style={s.linkBtn}>
            <Text style={s.link}>Não tem conta? <Text style={{ color: colors.brand }}>Criar conta</Text></Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 48 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2.4 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 72, color: colors.text, lineHeight: 72, marginTop: 8 },
  form: { gap: 12 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 15,
  },
  error: { fontFamily: font.body, fontSize: 13, color: colors.danger },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.brandInk, letterSpacing: 1 },
  linkBtn: { alignItems: 'center', marginTop: 8 },
  link: { fontFamily: font.body, fontSize: 14, color: colors.textDim },
});
