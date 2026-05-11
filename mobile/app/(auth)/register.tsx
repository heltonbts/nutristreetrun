import axios from 'axios';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
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

function AppCard({
  color,
  name,
  desc,
  onPress,
  actionLabel,
  disabled,
  loading,
}: {
  color: string;
  name: string;
  desc: string;
  onPress?: () => void;
  actionLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <View style={[ac.card, disabled && ac.cardDisabled]}>
      <View style={[ac.badge, { backgroundColor: color }]}>
        <Text style={ac.badgeLetter}>{name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ac.name}>{name}</Text>
        <Text style={ac.desc}>{desc}</Text>
      </View>
      {!disabled && onPress && (
        <Pressable style={ac.action} onPress={onPress} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Text style={ac.actionText}>{actionLabel}</Text>
          )}
        </Pressable>
      )}
      {disabled && (
        <View style={ac.soon}>
          <Text style={ac.soonText}>EM BREVE</Text>
        </View>
      )}
    </View>
  );
}

export default function RegisterScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
  const [stravaLoading, setStravaLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

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
      setPendingToken(data.access_token);
      setStep(3);
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

  async function handleConnectStrava() {
    if (!pendingToken) return;
    setStravaLoading(true);
    try {
      const { data } = await api.get<{ url: string }>('/auth/strava/url', {
        headers: { Authorization: `Bearer ${pendingToken}` },
      });
      await Linking.openURL(data.url);
    } catch (err) {
      Alert.alert('Erro ao conectar Strava', String(err));
    } finally {
      setStravaLoading(false);
    }
  }

  async function handleEnterApp() {
    if (!pendingToken) return;
    await setToken(pendingToken);
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
              <Text style={s.kicker}>PASSO 2 DE 3</Text>
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

        {/* ── STEP 3: SYNC ── */}
        {step === 3 && (
          <>
            <View style={s.header}>
              <Text style={s.kicker}>QUASE LÁ · PASSO 3 DE 3</Text>
              <Text style={s.title2}>CONECTE{'\n'}SEUS APPS</Text>
              <Text style={s.subtitle}>Suas corridas serão sincronizadas automaticamente.</Text>
            </View>
            <View style={s.form}>
              <AppCard
                color="#FC4C02"
                name="Strava"
                desc="Sincroniza corridas automaticamente"
                onPress={handleConnectStrava}
                actionLabel="CONECTAR"
                loading={stravaLoading}
              />
              <AppCard
                color="#FA2D48"
                name="Apple Health"
                desc="Disponível no app completo"
                disabled
              />
              <AppCard
                color="#4285F4"
                name="Google Fit"
                desc="Disponível no app completo"
                disabled
              />
              <View style={s.divider} />
              <AnimatedButton
                onPress={handleEnterApp}
                disabled={!pendingToken}
                loading={false}
                label="ENTRAR NO APP"
              />
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

const ac = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardDisabled: { opacity: 0.5 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLetter: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: 'white', lineHeight: 22 },
  name: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },
  desc: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  action: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  actionText: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 0.8 },
  soon: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  soonText: { fontFamily: font.bodyBold, fontSize: 9, color: colors.textMute, letterSpacing: 0.8 },
});
