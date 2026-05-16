import axios from 'axios';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PhoneInput from 'react-native-phone-number-input';

import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';
import { useAuthStore } from '../../src/store/auth.store';

function AnimatedButton({
  onPress,
  disabled,
  loading,
  label,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  label: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[s.btn, disabled && s.btnDisabled]}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        {loading ? (
          <ActivityIndicator color={colors.brandInk} />
        ) : (
          <Text style={s.btnText}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function RegisterScreen() {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [assessoria, setAssessoria] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneRef = useRef<PhoneInput>(null);
  const setToken = useAuthStore((s) => s.setToken);

  function handleContinue() {
    setError('');
    if (!name || !email || !confirmEmail || !formattedPhone || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    if (email.trim() !== confirmEmail.trim()) {
      setError('Os e-mails não coincidem');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setStep(2);
  }

  async function handleCreateAccount() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post<{ access_token: string }>('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        phone: formattedPhone,
        password,
        ...(city.trim() && { city: city.trim() }),
        ...(state.trim() && { state: state.trim().toUpperCase().slice(0, 2) }),
        ...(assessoria.trim() && { assessoria: assessoria.trim() }),
      });
      await setToken(data.access_token);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar conta'));
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* ── STEP 1: DADOS ── */}
        {step === 1 && (
          <>
            <View style={s.header}>
              <Text style={s.kicker}>CRIE SUA CONTA</Text>
              <Text style={s.title}>NUTRISTREET{'\n'}RUN</Text>
            </View>
            <View style={s.form}>
              <TextInput
                style={s.input}
                placeholder="Nome completo"
                placeholderTextColor={colors.textMute}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={s.input}
                placeholder="E-mail"
                placeholderTextColor={colors.textMute}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={s.input}
                placeholder="Confirmar e-mail"
                placeholderTextColor={colors.textMute}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmEmail}
                onChangeText={setConfirmEmail}
              />
              <PhoneInput
                ref={phoneRef}
                defaultCode="BR"
                layout="first"
                onChangeText={setPhone}
                onChangeFormattedText={setFormattedPhone}
                placeholder="Número de celular"
                containerStyle={s.phoneContainer}
                textContainerStyle={s.phoneTextContainer}
                textInputStyle={s.phoneTextInput}
                codeTextStyle={s.phoneCode}
                flagButtonStyle={s.phoneFlag}
                countryPickerButtonStyle={s.phoneFlag}
                countryPickerProps={{ withEmoji: true, withFilter: true, withFlag: true }}
              />
              <TextInput
                style={s.input}
                placeholder="Senha (mín. 6 caracteres)"
                placeholderTextColor={colors.textMute}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={s.input}
                placeholder="Confirmar senha"
                placeholderTextColor={colors.textMute}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <AnimatedButton
                onPress={handleContinue}
                disabled={false}
                loading={false}
                label="CONTINUAR"
              />
              <Link href="/(auth)/login" asChild>
                <Pressable style={s.linkBtn}>
                  <Text style={s.link}>
                    Já tem conta? <Text style={{ color: colors.brand }}>Entrar</Text>
                  </Text>
                </Pressable>
              </Link>
            </View>
          </>
        )}

        {/* ── STEP 2: ASSESSORIA ── */}
        {step === 2 && (
          <>
            <View style={s.header}>
              <Pressable
                onPress={() => {
                  setError('');
                  setStep(1);
                }}
                style={s.backBtn}
                hitSlop={12}
              >
                <Text style={s.backText}>← Voltar</Text>
              </Pressable>
              <Text style={s.kicker}>PASSO 2 DE 2</Text>
              <Text style={s.title2}>SUA{'\n'}ASSESSORIA</Text>
              <Text style={s.subtitle}>
                Pertence a uma assessoria de corrida?{'\n'}Inclua-a no ranking gratuitamente.
              </Text>
            </View>
            <View style={s.form}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Cidade"
                  placeholderTextColor={colors.textMute}
                  value={city}
                  onChangeText={setCity}
                  autoCorrect={false}
                />
                <TextInput
                  style={[s.input, { width: 64, textAlign: 'center' }]}
                  placeholder="UF"
                  placeholderTextColor={colors.textMute}
                  value={state}
                  onChangeText={setState}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={2}
                />
              </View>
              <TextInput
                style={s.input}
                placeholder="Assessoria (opcional)"
                placeholderTextColor={colors.textMute}
                value={assessoria}
                onChangeText={setAssessoria}
                autoCorrect={false}
              />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <AnimatedButton
                onPress={handleCreateAccount}
                disabled={loading}
                loading={loading}
                label="CRIAR CONTA"
              />
              <Pressable onPress={handleCreateAccount} style={s.linkBtn}>
                <Text style={s.link}>Pular esta etapa</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 40 },
  backBtn: { marginBottom: 20 },
  backText: { fontFamily: font.bodyBold, fontSize: 13, color: colors.brand },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2.4 },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 72,
    color: colors.text,
    lineHeight: 72,
    marginTop: 8,
  },
  title2: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: colors.text,
    lineHeight: 56,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textDim,
    lineHeight: 20,
    marginTop: 12,
  },
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
  phoneContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  phoneTextContainer: { backgroundColor: colors.card, paddingVertical: 0 },
  phoneTextInput: { color: colors.text, fontFamily: font.body, fontSize: 15, height: 52 },
  phoneCode: { color: colors.text, fontFamily: font.body, fontSize: 14 },
  phoneFlag: {
    backgroundColor: colors.card,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontFamily: font.body, fontSize: 13, color: colors.danger },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.brandInk,
    letterSpacing: 1,
  },
  linkBtn: { alignItems: 'center', marginTop: 8 },
  link: { fontFamily: font.body, fontSize: 14, color: colors.textDim },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});
