import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../src/lib/api';
import { saveRunToHealth } from '../../../src/lib/healthKit';
import { colors, font } from '../../../src/lib/tokens';
import { COORDS_KEY } from '../../../src/tasks/locationTask';

const SURFACES = [
  { key: 'asfalto', label: 'Asfalto' },
  { key: 'trilha', label: 'Trilha' },
  { key: 'esteira', label: 'Esteira' },
  { key: 'pista', label: 'Pista' },
  { key: 'areia', label: 'Areia' },
] as const;

const FEELINGS = [
  { value: 1, emoji: '😣', label: 'Difícil' },
  { value: 2, emoji: '😐', label: 'Cansativo' },
  { value: 3, emoji: '🙂', label: 'OK' },
  { value: 4, emoji: '😄', label: 'Bom' },
  { value: 5, emoji: '🤩', label: 'Excelente' },
];

const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export default function PostRunScreen() {
  const params = useLocalSearchParams<{
    distanceKm: string;
    durationSeconds: string;
    startedAt: string;
    routePolyline?: string;
    avgHeartRate?: string;
    maxHeartRate?: string;
    calories?: string;
    elevationGain?: string;
    steps?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const distanceKm = parseFloat(params.distanceKm ?? '0');
  const durationSeconds = parseInt(params.durationSeconds ?? '0', 10);
  const startedAt = new Date(params.startedAt ?? Date.now());
  const avgHeartRate = params.avgHeartRate ? parseInt(params.avgHeartRate, 10) : null;
  const maxHeartRate = params.maxHeartRate ? parseInt(params.maxHeartRate, 10) : null;
  const calories = params.calories ? parseInt(params.calories, 10) : 0;
  const elevationGain = params.elevationGain ? parseInt(params.elevationGain, 10) : 0;
  const steps = params.steps ? parseInt(params.steps, 10) : 0;

  const defaultTitle = `Corrida de ${weekdays[startedAt.getDay()]}`;
  const [title, setTitle] = useState(defaultTitle);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [surface, setSurface] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const paceSec = distanceKm > 0 ? durationSeconds / distanceKm : 0;
  const timeOfDay = startedAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateLabel = startedAt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post<{ newBestPace: boolean }>('/activities', {
        distanceKm,
        durationSeconds,
        startedAt: startedAt.toISOString(),
        title: title.trim() || defaultTitle,
        ...(params.routePolyline && { routePolyline: params.routePolyline }),
        ...(avgHeartRate && { avgHeartRate }),
        ...(maxHeartRate && { maxHeartRate }),
        ...(calories > 0 && { caloriesBurned: calories }),
        ...(feeling && { feeling }),
        ...(surface && { surface }),
        ...(note.trim() && { note: note.trim() }),
      });
      await AsyncStorage.removeItem(COORDS_KEY);
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['activities-summary'] });
      void saveRunToHealth({ startedAt, durationSeconds, distanceKm });
      if (res.data.newBestPace) {
        Alert.alert(
          '🏆 Novo recorde!',
          `Você bateu seu melhor pace pessoal: ${fmtPace(paceSec)}/km`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/feed') }],
        );
      } else {
        Alert.alert('Corrida salva! 🎉', `${distanceKm.toFixed(2)} km registrados.`, [
          { text: 'Ver no feed', onPress: () => router.replace('/(tabs)/feed') },
        ]);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a corrida. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>‹</Text>
          </Pressable>
          <Text style={s.headerTitle}>RESUMO</Text>
          <View style={{ width: 24 }} />
        </View>

        <TextInput
          style={s.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Título"
          placeholderTextColor={colors.textMute}
          maxLength={80}
        />
        <Text style={s.dateLabel}>
          {dateLabel} · {timeOfDay}
        </Text>

        <View style={s.metricsGrid}>
          <Metric value={distanceKm.toFixed(2)} unit="km" label="Distância" />
          <Metric value={fmtTime(durationSeconds)} label="Tempo movimento" />
          <Metric value={fmtPace(paceSec)} label="Pace médio" />
          {elevationGain > 0 ? (
            <Metric value={String(elevationGain)} unit="m" label="Ganho elevação" />
          ) : null}
          {steps > 0 ? <Metric value={steps.toLocaleString('pt-BR')} label="Passos" /> : null}
          {calories > 0 ? <Metric value={String(calories)} unit="kcal" label="Calorias" /> : null}
          {avgHeartRate ? (
            <Metric value={String(avgHeartRate)} unit="bpm" label="FC média" />
          ) : null}
          {maxHeartRate ? <Metric value={String(maxHeartRate)} unit="bpm" label="FC máx" /> : null}
        </View>

        <Section title="COMO VOCÊ SE SENTIU?">
          <View style={s.feelingsRow}>
            {FEELINGS.map((f) => (
              <Pressable
                key={f.value}
                style={[s.feelingItem, feeling === f.value && s.feelingItemActive]}
                onPress={() => setFeeling(feeling === f.value ? null : f.value)}
              >
                <Text style={s.feelingEmoji}>{f.emoji}</Text>
                <Text
                  style={[s.feelingLabel, feeling === f.value && { color: colors.brand }]}
                  numberOfLines={1}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="SUPERFÍCIE">
          <View style={s.chipsRow}>
            {SURFACES.map((sf) => (
              <Pressable
                key={sf.key}
                style={[s.chip, surface === sf.key && s.chipActive]}
                onPress={() => setSurface(surface === sf.key ? null : sf.key)}
              >
                <Text style={[s.chipText, surface === sf.key && { color: colors.brandInk }]}>
                  {sf.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="NOTA">
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Como foi a corrida? Treino, clima, sensações..."
            placeholderTextColor={colors.textMute}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.noteCounter}>{note.length}/500</Text>
        </Section>

        <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'SALVANDO...' : 'SALVAR CORRIDA'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Metric({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={s.metric}>
      <View style={s.metricValueRow}>
        <Text style={s.metricValue}>{value}</Text>
        {unit ? <Text style={s.metricUnit}>{unit}</Text> : null}
      </View>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  back: { color: colors.text, fontSize: 32, fontFamily: font.body, marginTop: -4 },
  headerTitle: {
    color: colors.text,
    fontFamily: font.bodyBold,
    fontSize: 14,
    letterSpacing: 1.2,
  },
  titleInput: {
    color: colors.text,
    fontFamily: font.bodyBold,
    fontSize: 24,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dateLabel: {
    color: colors.textDim,
    fontFamily: font.body,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  metric: { minWidth: '28%', flexGrow: 1 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  metricValue: { color: colors.text, fontFamily: font.bodyBold, fontSize: 24 },
  metricUnit: { color: colors.textDim, fontFamily: font.body, fontSize: 12 },
  metricLabel: {
    color: colors.textMute,
    fontFamily: font.body,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  section: { marginTop: 24 },
  sectionTitle: {
    color: colors.textDim,
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  feelingsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feelingItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: colors.card,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  feelingItemActive: {
    borderColor: colors.brand,
    backgroundColor: colors.cardHi,
  },
  feelingEmoji: { fontSize: 26, marginBottom: 4 },
  feelingLabel: {
    color: colors.textDim,
    fontFamily: font.body,
    fontSize: 10,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontFamily: font.bodyMedium, fontSize: 13 },
  noteInput: {
    minHeight: 96,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 20,
  },
  noteCounter: {
    color: colors.textMute,
    fontFamily: font.body,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: colors.brandInk,
    fontFamily: font.bodyBold,
    fontSize: 14,
    letterSpacing: 1,
  },
});
