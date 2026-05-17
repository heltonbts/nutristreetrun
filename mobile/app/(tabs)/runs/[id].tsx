import polylineCodec from '@mapbox/polyline';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DistanceIcon,
  FlameStatIcon,
  HeartIcon,
  PaceIcon,
  RunnerGlyph,
  SpeedIcon,
  StopwatchIcon,
} from '../../../src/components/UiIcons';
import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

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
  routePolyline: string | null;
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

// Decodifica o polyline em coords + região que enquadra o traçado.
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

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}
function StatCard({ icon, value, unit, label }: StatCardProps) {
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

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}
function StatRow({ icon, label, value, last }: StatRowProps) {
  return (
    <View style={[s.statRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.statRowIcon}>{icon}</View>
      <Text style={s.statRowLabel}>{label}</Text>
      <Text style={s.statRowValue}>{value}</Text>
    </View>
  );
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const pace = data.pace ?? '—';
  const calories = data.caloriesBurned;
  const avgHr = data.avgHeartRate;
  const maxHr = data.maxHeartRate;
  // Velocidade média em km/h (deriva de distância e duração).
  const avgSpeedKph = durSec > 0 ? (distanceKm / durSec) * 3600 : null;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar (botão voltar + status pill) */}
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

      {/* Header: nome / RUNNING / data */}
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

      {/* Mapa do percurso (full-bleed) */}
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

      {/* Stats grid 2×2 — destaque */}
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
        <StatCard icon={<PaceIcon color={colors.brand} />} value={pace} label="Pace médio /km" />
        <StatCard
          icon={<FlameStatIcon color={colors.brand} />}
          value={calories ? String(Math.round(calories)) : '—'}
          unit={calories ? 'kcal' : undefined}
          label="Calorias"
        />
      </View>

      {/* Lista detalhada — stats secundários */}
      <View style={s.detailList}>
        <StatRow
          icon={<SpeedIcon color={colors.textDim} />}
          label="Velocidade média"
          value={avgSpeedKph ? `${avgSpeedKph.toFixed(1)} km/h` : '—'}
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
          last
        />
      </View>

      {/* Challenge card — meta do mês (mantido) */}
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

  headerBlock: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16 },
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
  headerDate: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textMute,
    marginTop: 4,
  },
  skipBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  skipText: { fontFamily: font.body, fontSize: 12, color: colors.danger },

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

  // Grid 2x2 de stats principais
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

  // Lista detalhada (linhas com icone + label + valor à direita)
  detailList: {
    marginHorizontal: 14,
    marginTop: 16,
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
