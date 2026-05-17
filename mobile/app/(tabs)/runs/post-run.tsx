import polylineCodec from '@mapbox/polyline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';

import {
  DistanceIcon,
  DropletIcon,
  FlameStatIcon,
  HeartIcon,
  MountainIcon,
  PaceIcon,
  PauseIcon,
  SpeedIcon,
  StopwatchIcon,
} from '../../../src/components/UiIcons';
import { api } from '../../../src/lib/api';
import { saveRunToHealth } from '../../../src/lib/healthKit';
import { colors, font } from '../../../src/lib/tokens';
import { COORDS_KEY } from '../../../src/tasks/locationTask';

const { width: SCREEN_W } = Dimensions.get('window');

// Decode polyline → coords + região; null se vazio/curto (caller esconde o mapa).
function decodeRouteRegion(encoded: string | undefined) {
  if (!encoded) return null;
  let pairs: [number, number][] = [];
  try {
    pairs = polylineCodec.decode(encoded);
  } catch {
    return null;
  }
  if (pairs.length < 2) return null;
  const coords = pairs.map(([latitude, longitude]) => ({ latitude, longitude }));
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLng = coords[0].longitude;
  let maxLng = coords[0].longitude;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }
  const region: Region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.005),
  };
  return { coords, region };
}

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

// ─── Tabs (mesmo padrão visual do detalhe runs/[id]) ──────────────────────────
// NOTA: padrão duplicado de runs/[id].tsx de propósito — extrair p/ componente
// compartilhado quando ambas as telas estabilizarem (débito técnico conhecido).

interface Split {
  km: number;
  paceSec: number;
  elevDelta?: number;
}

type TabKey = 'map' | 'stats' | 'splits';

function TabsBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { id: TabKey; label: string }[] = [
    { id: 'map', label: 'Mapa' },
    { id: 'stats', label: 'Stats' },
    { id: 'splits', label: 'Splits' },
  ];
  return (
    <View style={s.tabsBar}>
      {tabs.map((t) => {
        const focused = active === t.id;
        return (
          <Pressable key={t.id} style={s.tabBtn} onPress={() => onChange(t.id)} hitSlop={6}>
            <Text style={[s.tabText, focused && s.tabTextActive]}>{t.label}</Text>
            {focused && <View style={s.tabUnderline} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.statRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.statRowIcon}>{icon}</View>
      <Text style={s.statRowLabel}>{label}</Text>
      <Text style={s.statRowValue}>{value}</Text>
    </View>
  );
}

function PaceChart({ splits }: { splits: Split[] }) {
  const H = 140;
  const W = SCREEN_W - 28 - 40; // padding do scroll (20*2) já recortado pelo container
  const padX = 12;
  const padY = 18;
  if (splits.length < 2) return null;
  const paces = splits.map((sp) => sp.paceSec);
  const minP = Math.min(...paces);
  const maxP = Math.max(...paces);
  const range = Math.max(maxP - minP, 1);
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const stepX = innerW / (splits.length - 1);
  const points = splits.map((sp, i) => {
    const x = padX + i * stepX;
    const norm = 1 - (sp.paceSec - minP) / range; // 1 = mais rápido
    const y = padY + (1 - norm) * innerH;
    return { x, y };
  });
  const d = points.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`)).join(' ');
  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <SvgPath
          d={d}
          stroke={colors.brand}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function PostRunScreen() {
  const params = useLocalSearchParams<{
    distanceKm: string;
    durationSeconds: string;
    startedAt: string;
    routePolyline?: string;
    splits?: string;
    avgHeartRate?: string;
    maxHeartRate?: string;
    calories?: string;
    elevationGain?: string;
    elevationLoss?: string;
    maxElevation?: string;
    maxSpeed?: string;
    pauseSec?: string;
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
  const elevationLoss = params.elevationLoss ? parseInt(params.elevationLoss, 10) : 0;
  const maxElevation = params.maxElevation ? parseInt(params.maxElevation, 10) : null;
  const maxSpeed = params.maxSpeed ? parseFloat(params.maxSpeed) : 0;
  const pauseSec = params.pauseSec ? parseInt(params.pauseSec, 10) : 0;
  const steps = params.steps ? parseInt(params.steps, 10) : 0;

  const defaultTitle = `Corrida de ${weekdays[startedAt.getDay()]}`;
  const [title, setTitle] = useState(defaultTitle);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [surface, setSurface] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ newBest: boolean } | null>(null);

  const route = useMemo(() => decodeRouteRegion(params.routePolyline), [params.routePolyline]);

  const splits = useMemo<Split[]>(() => {
    if (!params.splits) return [];
    try {
      const parsed = JSON.parse(params.splits);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.splits]);

  const avgSpeedKph =
    durationSeconds > 0 && distanceKm > 0 ? (distanceKm / durationSeconds) * 3600 : null;
  const dehydrationMl = durationSeconds > 0 ? Math.round((durationSeconds / 3600) * 700) : 0;
  const splitsBest = splits.length > 1 ? Math.min(...splits.map((sp) => sp.paceSec)) : null;
  const splitsWorst = splits.length > 1 ? Math.max(...splits.map((sp) => sp.paceSec)) : null;

  // Transição de tab: crossfade + slide sutil (mesmo padrão do detalhe).
  const [tab, setTab] = useState<TabKey>('map');
  const TAB_ORDER: TabKey[] = ['map', 'stats', 'splits'];
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const switchTab = (next: TabKey) => {
    if (next === tab) return;
    const dir = TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 110,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: -dir * 12,
        duration: 110,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTab(next);
      slide.setValue(dir * 12);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

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
      // Splits chegaram como JSON string via params (router só serializa
      // primitives); aqui voltam pra array antes de mandar pro backend.
      let splitsArray: unknown[] | undefined;
      if (params.splits) {
        try {
          const parsed = JSON.parse(params.splits);
          if (Array.isArray(parsed)) splitsArray = parsed;
        } catch {
          // ignora splits corrompido — não bloqueia o save
        }
      }
      const res = await api.post<{ newBestPace: boolean }>('/activities', {
        distanceKm,
        durationSeconds,
        startedAt: startedAt.toISOString(),
        title: title.trim() || defaultTitle,
        ...(params.routePolyline && { routePolyline: params.routePolyline }),
        ...(splitsArray && { splits: splitsArray }),
        ...(elevationGain > 0 && { elevationGainM: elevationGain }),
        ...(elevationLoss > 0 && { elevationLossM: elevationLoss }),
        ...(maxElevation != null && { maxElevationM: maxElevation }),
        ...(maxSpeed > 0 && { maxSpeedKph: maxSpeed }),
        ...(pauseSec > 0 && { pauseSec }),
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
      setResult({ newBest: res.data.newBestPace });
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

        <TabsBar active={tab} onChange={switchTab} />

        <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
          {/* ── Tab Mapa: percurso + 4 cards principais ─────────────────────── */}
          {tab === 'map' && (
            <>
              {route ? (
                <View style={s.mapWrap} pointerEvents="none">
                  <MapView
                    style={StyleSheet.absoluteFill}
                    region={route.region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    loadingEnabled
                    loadingBackgroundColor={colors.card}
                  >
                    <Polyline
                      coordinates={route.coords}
                      strokeColor={colors.brand}
                      strokeWidth={5}
                    />
                  </MapView>
                </View>
              ) : null}

              <View style={s.metricsGrid}>
                <Metric
                  icon={<DistanceIcon color={colors.brand} />}
                  value={distanceKm.toFixed(2)}
                  unit="km"
                  label="Distância"
                />
                <Metric
                  icon={<StopwatchIcon color={colors.brand} />}
                  value={fmtTime(durationSeconds)}
                  label="Tempo"
                />
                <Metric
                  icon={<PaceIcon color={colors.brand} />}
                  value={fmtPace(paceSec)}
                  label="Pace médio /km"
                />
                <Metric
                  icon={<FlameStatIcon color={colors.brand} />}
                  value={calories > 0 ? String(calories) : '—'}
                  unit={calories > 0 ? 'kcal' : undefined}
                  label="Calorias"
                />
              </View>
            </>
          )}

          {/* ── Tab Stats: lista detalhada ──────────────────────────────────── */}
          {tab === 'stats' && (
            <View style={s.detailList}>
              <StatRow
                icon={<SpeedIcon color={colors.textDim} />}
                label="Velocidade média"
                value={avgSpeedKph ? `${avgSpeedKph.toFixed(1)} km/h` : '—'}
              />
              <StatRow
                icon={<SpeedIcon color={colors.textDim} />}
                label="Velocidade máxima"
                value={maxSpeed > 0 ? `${maxSpeed.toFixed(1)} km/h` : '—'}
              />
              <StatRow
                icon={<MountainIcon color={colors.textDim} />}
                label="Ganho de elevação"
                value={elevationGain > 0 ? `${elevationGain} m` : '—'}
              />
              <StatRow
                icon={<MountainIcon color={colors.textDim} />}
                label="Perda de elevação"
                value={elevationLoss > 0 ? `${elevationLoss} m` : '—'}
              />
              <StatRow
                icon={<MountainIcon color={colors.textDim} />}
                label="Altitude máxima"
                value={maxElevation != null ? `${maxElevation} m` : '—'}
              />
              <StatRow
                icon={<HeartIcon color={colors.textDim} />}
                label="FC média"
                value={avgHeartRate ? `${avgHeartRate} bpm` : '—'}
              />
              <StatRow
                icon={<HeartIcon color={colors.textDim} />}
                label="FC máxima"
                value={maxHeartRate ? `${maxHeartRate} bpm` : '—'}
              />
              <StatRow
                icon={<PauseIcon color={colors.textDim} />}
                label="Tempo em pausa"
                value={pauseSec > 0 ? fmtTime(pauseSec) : '—'}
              />
              <StatRow
                icon={<DistanceIcon color={colors.textDim} />}
                label="Passos"
                value={steps > 0 ? steps.toLocaleString('pt-BR') : '—'}
              />
              <StatRow
                icon={<DropletIcon color={colors.textDim} />}
                label="Hidratação estimada"
                value={dehydrationMl > 0 ? `${dehydrationMl.toLocaleString('pt-BR')} ml` : '—'}
                last
              />
            </View>
          )}

          {/* ── Tab Splits: chart + lista ───────────────────────────────────── */}
          {tab === 'splits' && (
            <View style={{ gap: 14 }}>
              {splits.length === 0 ? (
                <View style={s.emptySplits}>
                  <Text style={s.emptyText}>Sem splits</Text>
                  <Text style={s.emptyHint}>
                    Splits são gerados a cada km completo durante a corrida.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>RITMO POR KM</Text>
                    <PaceChart splits={splits} />
                    <Text style={s.chartLegendText}>
                      Pico mais alto = pace mais rápido · mais baixo = mais lento
                    </Text>
                  </View>
                  <View style={s.splitsList}>
                    <View style={s.splitsHeader}>
                      <Text style={[s.splitHeaderText, { width: 36 }]}>KM</Text>
                      <Text style={[s.splitHeaderText, { flex: 1, textAlign: 'right' }]}>PACE</Text>
                      <Text style={[s.splitHeaderText, { width: 72, textAlign: 'right' }]}>
                        ELEV
                      </Text>
                    </View>
                    {splits.map((sp, i) => {
                      const isLast = i === splits.length - 1;
                      let paceColor = colors.text;
                      if (splitsBest != null && sp.paceSec === splitsBest) paceColor = colors.brand;
                      else if (splitsWorst != null && sp.paceSec === splitsWorst)
                        paceColor = colors.danger;
                      return (
                        <View key={sp.km} style={[s.splitRow, isLast && { borderBottomWidth: 0 }]}>
                          <Text style={[s.splitCol, { width: 36, color: paceColor }]}>{sp.km}</Text>
                          <Text
                            style={[s.splitPace, { flex: 1, textAlign: 'right', color: paceColor }]}
                          >
                            {fmtPace(sp.paceSec)}
                          </Text>
                          <Text style={[s.splitElev, { width: 72, textAlign: 'right' }]}>
                            {sp.elevDelta != null
                              ? `${sp.elevDelta >= 0 ? '+' : ''}${Math.round(sp.elevDelta)} m`
                              : '—'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}
        </Animated.View>

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

      <Modal visible={!!result} transparent animationType="fade" statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIcon, result?.newBest && s.modalIconGold]}>
              <Text style={s.modalIconText}>{result?.newBest ? '🏆' : '✓'}</Text>
            </View>
            <Text style={s.modalTitle}>{result?.newBest ? 'NOVO RECORDE!' : 'CORRIDA SALVA!'}</Text>
            <Text style={s.modalSub}>
              {result?.newBest
                ? `Seu melhor pace: ${fmtPace(paceSec)}/km`
                : `${distanceKm.toFixed(2)} km registrados`}
            </Text>

            <Pressable
              style={({ pressed }) => [s.modalBtnPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => {
                // 1) desempilha o stack `runs` (saímos do post-run).
                // 2) troca pra aba `feed` — router.replace direto não
                //    cruzava as abas (pager) por estar no contexto do stack.
                router.dismissAll();
                router.navigate('/(tabs)/feed');
              }}
            >
              <Text style={s.modalBtnPrimaryText}>VER NO FEED</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.modalBtnSecondary, pressed && { opacity: 0.6 }]}
              onPress={() => router.dismissAll()}
            >
              <Text style={s.modalBtnSecondaryText}>MINHAS CORRIDAS</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

function Metric({
  icon,
  value,
  unit,
  label,
}: {
  icon?: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View style={s.metric}>
      {icon ? <View style={s.metricIconWrap}>{icon}</View> : null}
      <View style={s.metricValueRow}>
        <Text style={s.metricValue}>{value}</Text>
        {unit ? <Text style={s.metricUnit}> {unit}</Text> : null}
      </View>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(95,184,168,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIconGold: {
    backgroundColor: 'rgba(255,200,0,0.15)',
    borderColor: 'rgba(255,200,0,0.45)',
  },
  modalIconText: { fontSize: 30, color: colors.brand },
  modalTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    color: colors.text,
    letterSpacing: 1,
    lineHeight: 32,
  },
  modalSub: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.textMute,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalBtnPrimary: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.brandInk,
    letterSpacing: 1.5,
  },
  modalBtnSecondary: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalBtnSecondaryText: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.textMute,
    letterSpacing: 1,
  },
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
  // Mapa full-bleed do percurso (mesmo padrão do detalhe)
  mapWrap: {
    width: SCREEN_W,
    height: 220,
    marginHorizontal: -20, // estende além do paddingHorizontal do scroll (= -20)
    marginTop: 16,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  // Grid 2 colunas de stats com ícone (estilo card)
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  metric: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(95,184,168,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  metricValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    color: colors.text,
    lineHeight: 32,
    letterSpacing: 0.4,
  },
  metricUnit: { fontFamily: font.body, fontSize: 12, color: colors.textMute },
  metricLabel: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
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

  // ── Tabs (padrão do detalhe runs/[id]) ──────────────────────────────────────
  tabsBar: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, position: 'relative' },
  tabText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.textMute,
    letterSpacing: 0.8,
  },
  tabTextActive: { color: colors.text },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.brand,
  },

  // ── Tab Stats: lista ────────────────────────────────────────────────────────
  detailList: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  statRowIcon: { width: 28, alignItems: 'center' },
  statRowLabel: {
    flex: 1,
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.textDim,
    marginLeft: 8,
  },
  statRowValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.4,
  },

  // ── Tab Splits: chart + lista ───────────────────────────────────────────────
  chartCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  chartTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: colors.text,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chartLegendText: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    marginTop: 6,
  },
  splitsList: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  splitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  splitHeaderText: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  splitCol: { fontFamily: font.bodyBold, fontSize: 13 },
  splitPace: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  splitElev: { fontFamily: font.body, fontSize: 12, color: colors.textMute },
  emptySplits: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.textDim },
  emptyHint: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 18,
  },
});
