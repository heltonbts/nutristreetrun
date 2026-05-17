import polylineCodec from '@mapbox/polyline';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  RunnerGlyph,
  SpeedIcon,
  StopwatchIcon,
} from '../../../src/components/UiIcons';
import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

interface Split {
  km: number;
  paceSec: number;
  elevDelta?: number;
}

interface ActivityDetail {
  id: string;
  title: string;
  distanceKm: number;
  pace: string | null;
  source: string;
  counts: boolean;
  skipReason: string | null;
  startedAt: string;
  durationSec: number | null;
  pauseSec: number | null;
  routePolyline: string | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  maxElevationM: number | null;
  maxSpeedKph: number | null;
  splits: Split[] | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  caloriesBurned: number | null;
  challenge: {
    title: string;
    goalKm: number;
    doneKm: number;
    daysLeft: number;
    kmPerDayNeeded: number;
    pct: number;
  } | null;
}

const { width: SCREEN_W } = Dimensions.get('window');

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function decodeRoute(encoded: string | null) {
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

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

// ─── Stat building blocks ─────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  unit,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View style={s.statCard}>
      <View style={s.statIconWrap}>{icon}</View>
      <View style={s.statValueRow}>
        <Text style={s.statValue}>{value}</Text>
        {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </View>
      <Text style={s.statLabel}>{label}</Text>
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

// ─── Pace chart (splits) ──────────────────────────────────────────────────────

function PaceChart({ splits }: { splits: Split[] }) {
  const H = 140;
  const W = SCREEN_W - 28; // mesma horizontal das listas
  const padX = 12;
  const padY = 18;

  if (splits.length < 2) return null;
  const paces = splits.map((s) => s.paceSec);
  const minP = Math.min(...paces);
  const maxP = Math.max(...paces);
  const range = Math.max(maxP - minP, 1);

  // y maior = pace pior (mais lento) → invertido visualmente, mas no chart
  // queremos "linha mais baixa = pace pior". Bom, isso é convenção: linha
  // mais alta = pace MELHOR (rápido) — gráfico fica "alto = bom".
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const stepX = splits.length === 1 ? 0 : innerW / (splits.length - 1);

  const points = splits.map((sp, i) => {
    const x = padX + i * stepX;
    // normalize pace: 0..1 onde 0 = mais lento (pior), 1 = mais rápido (melhor)
    const norm = 1 - (sp.paceSec - minP) / range;
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('map');

  // Transição de tab: crossfade + slide horizontal sutil. Direção depende
  // da posição da tab nova (à direita do atual = slide pra esquerda).
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

  const { data, isLoading, isError } = useQuery<ActivityDetail>({
    queryKey: ['activity', id],
    queryFn: () => api.get(`/activities/${id}`).then((r) => r.data as ActivityDetail),
    enabled: !!id,
  });

  const route = useMemo(() => decodeRoute(data?.routePolyline ?? null), [data?.routePolyline]);

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.errorText}>Não foi possível carregar a corrida.</Text>
      </View>
    );
  }

  const distanceKm = data.distanceKm;
  const durSec = data.durationSec ?? 0;
  const pause = data.pauseSec ?? 0;
  const pace = data.pace ?? '—';
  const calories = data.caloriesBurned;
  const avgHr = data.avgHeartRate;
  const maxHr = data.maxHeartRate;
  const elevGain = data.elevationGainM;
  const elevLoss = data.elevationLossM;
  const maxElev = data.maxElevationM;
  const maxSpd = data.maxSpeedKph;
  const splits = data.splits ?? [];
  // Velocidade média em km/h (deriva).
  const avgSpeedKph = durSec > 0 ? (distanceKm / durSec) * 3600 : null;
  // Hidratação estimada (~700 ml/h).
  const dehydrationMl = durSec > 0 ? Math.round((durSec / 3600) * 700) : 0;

  // Best/worst splits (mostra emoji-free coloração na lista).
  const splitsBest = splits.length > 1 ? Math.min(...splits.map((s) => s.paceSec)) : null;
  const splitsWorst = splits.length > 1 ? Math.max(...splits.map((s) => s.paceSec)) : null;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        {data.counts ? (
          <Text style={s.pillValid}>✓ CONTA</Text>
        ) : (
          <Text style={s.pillInvalid}>NÃO CONTA</Text>
        )}
      </View>

      <View style={s.headerBlock}>
        <Text style={s.headerKicker}>{data.title.toUpperCase()}</Text>
        <View style={s.headerTypeRow}>
          <RunnerGlyph size={24} color={colors.brand} strokeWidth={1.9} />
          <Text style={s.headerType}>CORRIDA</Text>
        </View>
        <Text style={s.headerDate}>{fmtDate(data.startedAt)}</Text>
        {!data.counts && data.skipReason ? (
          <View style={s.skipBanner}>
            <Text style={s.skipText}>⚠ {data.skipReason}</Text>
          </View>
        ) : null}
      </View>

      <TabsBar active={tab} onChange={switchTab} />

      <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
        {/* ── Tab Mapa ───────────────────────────────────────────────────────── */}
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
                  <Polyline coordinates={route.coords} strokeColor={colors.brand} strokeWidth={5} />
                </MapView>
              </View>
            ) : (
              <View style={[s.mapWrap, s.mapPlaceholder]}>
                <Text style={s.mapPlaceholderText}>Sem traçado salvo</Text>
              </View>
            )}

            <View style={s.statsGrid}>
              <StatCard
                icon={<DistanceIcon color={colors.brand} />}
                value={distanceKm.toFixed(2)}
                unit="km"
                label="Distância"
              />
              <StatCard
                icon={<StopwatchIcon color={colors.brand} />}
                value={fmtDuration(durSec)}
                label="Duração"
              />
              <StatCard
                icon={<PaceIcon color={colors.brand} />}
                value={pace}
                label="Pace médio /km"
              />
              <StatCard
                icon={<FlameStatIcon color={colors.brand} />}
                value={calories ? String(Math.round(calories)) : '—'}
                unit={calories ? 'kcal' : undefined}
                label="Calorias"
              />
            </View>
          </>
        )}

        {/* ── Tab Stats ──────────────────────────────────────────────────────── */}
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
              value={maxSpd != null ? `${maxSpd.toFixed(1)} km/h` : '—'}
            />
            <StatRow
              icon={<MountainIcon color={colors.textDim} />}
              label="Ganho de elevação"
              value={elevGain != null ? `${elevGain} m` : '—'}
            />
            <StatRow
              icon={<MountainIcon color={colors.textDim} />}
              label="Perda de elevação"
              value={elevLoss != null ? `${elevLoss} m` : '—'}
            />
            <StatRow
              icon={<MountainIcon color={colors.textDim} />}
              label="Altitude máxima"
              value={maxElev != null ? `${maxElev} m` : '—'}
            />
            <StatRow
              icon={<HeartIcon color={colors.textDim} />}
              label="FC média"
              value={avgHr ? `${Math.round(avgHr)} bpm` : '—'}
            />
            <StatRow
              icon={<HeartIcon color={colors.textDim} />}
              label="FC máxima"
              value={maxHr ? `${Math.round(maxHr)} bpm` : '—'}
            />
            <StatRow
              icon={<PauseIcon color={colors.textDim} />}
              label="Tempo em pausa"
              value={pause > 0 ? fmtDuration(pause) : '—'}
            />
            <StatRow
              icon={<DropletIcon color={colors.textDim} />}
              label="Hidratação estimada"
              value={dehydrationMl > 0 ? `${dehydrationMl.toLocaleString('pt-BR')} ml` : '—'}
              last
            />
          </View>
        )}

        {/* ── Tab Splits ─────────────────────────────────────────────────────── */}
        {tab === 'splits' && (
          <View style={{ paddingHorizontal: 14, gap: 14 }}>
            {splits.length === 0 ? (
              <View style={[s.emptySplits]}>
                <Text style={s.emptyText}>Sem splits salvos</Text>
                <Text style={s.emptyHint}>
                  Splits são gerados a cada km durante a corrida e ficam salvos com a atividade.
                </Text>
              </View>
            ) : (
              <>
                <View style={s.chartCard}>
                  <Text style={s.chartTitle}>RITMO POR KM</Text>
                  <PaceChart splits={splits} />
                  <View style={s.chartLegend}>
                    <Text style={s.chartLegendText}>
                      Pico mais alto = pace mais rápido · mais baixo = mais lento
                    </Text>
                  </View>
                </View>

                <View style={s.splitsList}>
                  <View style={s.splitsHeader}>
                    <Text style={[s.splitHeaderText, { width: 36 }]}>KM</Text>
                    <Text style={[s.splitHeaderText, { flex: 1, textAlign: 'right' }]}>PACE</Text>
                    <Text style={[s.splitHeaderText, { width: 72, textAlign: 'right' }]}>ELEV</Text>
                  </View>
                  {splits.map((sp, i) => {
                    const isLast = i === splits.length - 1;
                    // Cor: melhor = brand, pior = danger, resto = text.
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

      {/* Challenge card */}
      {data.challenge && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>META DO MÊS</Text>
          <View style={s.challengeCard}>
            <Text style={s.challengeTitle}>{data.challenge.title}</Text>
            <View style={s.challengeKmRow}>
              <Text style={s.challengeKmDone}>{data.challenge.doneKm.toFixed(1)}</Text>
              <Text style={s.challengeKmSep}> / </Text>
              <Text style={s.challengeKmGoal}>{data.challenge.goalKm} km</Text>
              <Text style={s.challengePct}> · {data.challenge.pct}%</Text>
            </View>
            <View style={s.barTrack}>
              <View
                style={[s.barFill, { width: `${Math.min(data.challenge.pct, 100)}%` as any }]}
              />
            </View>
            <View style={s.challengeFooter}>
              {data.challenge.daysLeft > 0 ? (
                <>
                  <View style={s.challengeStat}>
                    <Text style={s.challengeStatValue}>{data.challenge.daysLeft}</Text>
                    <Text style={s.challengeStatLabel}>dias restantes</Text>
                  </View>
                  <View style={s.challengeStatDivider} />
                  <View style={s.challengeStat}>
                    <Text style={[s.challengeStatValue, { color: colors.brand }]}>
                      {data.challenge.kmPerDayNeeded.toFixed(1)}
                    </Text>
                    <Text style={s.challengeStatLabel}>km/dia necessários</Text>
                  </View>
                </>
              ) : (
                <Text style={s.challengeFinished}>
                  {data.challenge.pct >= 100 ? '🏅 Meta batida!' : 'Desafio encerrado'}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: font.body, fontSize: 14, color: colors.textMute },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backArrow: {
    fontFamily: font.body,
    fontSize: 28,
    color: colors.text,
    lineHeight: 30,
    marginLeft: -2,
  },
  pillValid: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.brand,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.4)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillInvalid: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  headerBlock: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 12 },
  headerKicker: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 2,
  },
  headerTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  headerType: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: colors.text,
    lineHeight: 38,
    letterSpacing: 1,
  },
  headerDate: { fontFamily: font.body, fontSize: 13, color: colors.textMute, marginTop: 4 },
  skipBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  skipText: { fontFamily: font.body, fontSize: 12, color: colors.danger },

  // Tabs bar
  tabsBar: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
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

  // Map
  mapWrap: {
    width: SCREEN_W,
    height: 280,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mapPlaceholderText: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
    letterSpacing: 0.6,
  },

  // Grid principal
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(95,184,168,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    color: colors.text,
    lineHeight: 32,
    letterSpacing: 0.4,
  },
  statUnit: { fontFamily: font.body, fontSize: 12, color: colors.textMute },
  statLabel: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 0.4,
  },

  // Lista de stats (tab Stats)
  detailList: {
    marginHorizontal: 14,
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

  // Chart + splits
  chartCard: {
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
  chartLegend: { marginTop: 4 },
  chartLegendText: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.2,
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
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: colors.textDim,
  },
  emptyHint: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Challenge card
  section: { paddingHorizontal: 14, marginTop: 22 },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: 10,
  },
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
  },
  challengeTitle: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  challengeKmRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  challengeKmDone: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: colors.text,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  challengeKmSep: { fontFamily: font.body, fontSize: 18, color: colors.textMute },
  challengeKmGoal: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: colors.textDim,
    lineHeight: 26,
  },
  challengePct: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.brand,
    marginLeft: 4,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  barFill: { height: 6, backgroundColor: colors.brand, borderRadius: 3 },
  challengeFooter: { flexDirection: 'row', alignItems: 'center' },
  challengeStat: { flex: 1, alignItems: 'center' },
  challengeStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.line,
    marginHorizontal: 8,
  },
  challengeStatValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: colors.text,
    lineHeight: 34,
    letterSpacing: 0.4,
  },
  challengeStatLabel: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    marginTop: 2,
    textAlign: 'center',
  },
  challengeFinished: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
