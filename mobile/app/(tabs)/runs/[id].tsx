import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

interface StravaSplit {
  split: number;
  distance: number;
  moving_time: number;
  elevation_difference: number;
  average_speed: number;
  average_heartrate?: number;
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
  stravaId: number | null;
  strava: {
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    average_speed: number;
    max_speed: number;
    average_cadence?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    calories?: number;
    suffer_score?: number;
    achievement_count: number;
    kudos_count: number;
    comment_count: number;
    description?: string;
    type: string;
    sport_type: string;
    splits_metric?: StravaSplit[];
  } | null;
  challenge: {
    title: string;
    goalKm: number;
    doneKm: number;
    daysLeft: number;
    kmPerDayNeeded: number;
    pct: number;
  } | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min ${String(s).padStart(2, '0')}s`;
}

function speedToPace(mps: number): string {
  if (!mps || mps <= 0) return '—';
  const secPerKm = 1000 / mps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function splitPaceColor(mps: number, avgMps: number): string {
  if (!mps || !avgMps) return colors.text;
  const ratio = mps / avgMps;
  if (ratio >= 1.03) return colors.success;
  if (ratio <= 0.97) return colors.danger;
  return colors.text;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatItem({
  value,
  label,
  unit,
  accent,
}: {
  value: string;
  label: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <View style={s.statItem}>
      <View style={s.statValueRow}>
        <Text style={[s.statValue, accent && { color: colors.brand }]}>{value}</Text>
        {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={s.statLabel}>{label}</Text>
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

  const st = data?.strava ?? null;
  const ch = data?.challenge ?? null;

  const distanceKm = st ? st.distance / 1000 : (data?.distanceKm ?? 0);
  const movingTime = st?.moving_time ?? 0;
  const pace = data?.pace ?? (st ? speedToPace(st.average_speed) : '—');
  const elevation = st?.total_elevation_gain ?? 0;
  const avgHr = st?.average_heartrate;
  const maxHr = st?.max_heartrate;
  const cadence = st?.average_cadence ? Math.round(st.average_cadence * 2) : null;
  const calories = st?.calories;
  const sufferScore = st?.suffer_score;
  const maxSpeedPace = st ? speedToPace(st.max_speed) : null;
  const splits = st?.splits_metric ?? [];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Corridas</Text>
        </Pressable>
        {data?.counts ? (
          <Text style={s.pillValid}>✓ CONTA</Text>
        ) : data ? (
          <Text style={s.pillInvalid}>NÃO CONTA</Text>
        ) : null}
      </View>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : isError || !data ? (
        <View style={s.loading}>
          <Text style={s.errorText}>Não foi possível carregar a corrida.</Text>
        </View>
      ) : (
        <>
          {/* Activity header */}
          <View style={s.actHeader}>
            <Text style={s.actDate}>{formatDate(data.startedAt)}</Text>
            <Text style={s.actTitle} numberOfLines={2}>
              {data.title}
            </Text>
            {data.source === 'Strava' && <Text style={s.sourceTag}>via Strava</Text>}
            {!data.counts && data.skipReason ? (
              <View style={s.skipBanner}>
                <Text style={s.skipText}>⚠ {data.skipReason}</Text>
              </View>
            ) : null}
          </View>

          {/* Hero card */}
          <View style={s.heroCard}>
            <Text style={s.heroKm}>
              {distanceKm.toFixed(2)}
              <Text style={s.heroKmUnit}> km</Text>
            </Text>
            <View style={s.heroDivider} />
            <View style={s.heroRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{formatDuration(movingTime)}</Text>
                <Text style={s.heroStatLabel}>Tempo em movimento</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{pace}</Text>
                <Text style={s.heroStatLabel}>Pace médio / km</Text>
              </View>
            </View>
          </View>

          {/* Detail stats grid */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>DETALHES</Text>
            <View style={s.statsGrid}>
              <StatItem
                value={elevation > 0 ? `+${Math.round(elevation)}` : '—'}
                unit={elevation > 0 ? 'm' : undefined}
                label="Ganho de elevação"
              />
              {avgHr ? (
                <StatItem value={String(Math.round(avgHr))} unit="bpm" label="FC média" />
              ) : (
                <StatItem value="—" label="FC média" />
              )}
              {maxHr ? (
                <StatItem value={String(Math.round(maxHr))} unit="bpm" label="FC máxima" />
              ) : (
                <StatItem value="—" label="FC máxima" />
              )}
              {cadence ? (
                <StatItem value={String(cadence)} unit="ppm" label="Cadência" />
              ) : (
                <StatItem value="—" label="Cadência" />
              )}
              {calories ? (
                <StatItem
                  value={String(Math.round(calories))}
                  unit="kcal"
                  label="Calorias"
                  accent
                />
              ) : (
                <StatItem value="—" label="Calorias" />
              )}
              {maxSpeedPace ? <StatItem value={maxSpeedPace} label="Pace máximo" /> : null}
              {sufferScore ? <StatItem value={String(sufferScore)} label="Sofrimento" /> : null}
              {st && st.kudos_count > 0 ? (
                <StatItem value={String(st.kudos_count)} label="Kudos no Strava" />
              ) : null}
              {st && st.achievement_count > 0 ? (
                <StatItem value={String(st.achievement_count)} label="Conquistas" accent />
              ) : null}
            </View>
          </View>

          {/* Splits */}
          {splits.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>SPLITS POR KM</Text>
              <View style={s.splitsCard}>
                <View style={s.splitsHeader}>
                  <Text style={[s.splitCol, s.splitHeaderText]}>KM</Text>
                  <Text style={[s.splitColMid, s.splitHeaderText]}>PACE</Text>
                  <Text style={[s.splitColRight, s.splitHeaderText]}>ELEVAÇÃO</Text>
                  {splits[0]?.average_heartrate ? (
                    <Text style={[s.splitColRight, s.splitHeaderText]}>FC</Text>
                  ) : null}
                </View>
                {splits.map((sp, i) => {
                  const isLast = i === splits.length - 1;
                  return (
                    <View key={sp.split} style={[s.splitRow, isLast && s.splitRowLast]}>
                      <Text style={s.splitCol}>{sp.split}</Text>
                      <Text
                        style={[
                          s.splitColMid,
                          s.splitPace,
                          {
                            color: splitPaceColor(sp.average_speed, st?.average_speed ?? 0),
                          },
                        ]}
                      >
                        {speedToPace(sp.average_speed)}
                      </Text>
                      <Text style={[s.splitColRight, s.splitElev]}>
                        {sp.elevation_difference >= 0
                          ? `+${Math.round(sp.elevation_difference)}m`
                          : `${Math.round(sp.elevation_difference)}m`}
                      </Text>
                      {sp.average_heartrate ? (
                        <Text style={[s.splitColRight, s.splitHr]}>
                          {Math.round(sp.average_heartrate)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Challenge card */}
          {ch && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>META DO MÊS</Text>
              <View style={s.challengeCard}>
                <Text style={s.challengeTitle}>{ch.title}</Text>

                <View style={s.challengeKmRow}>
                  <Text style={s.challengeKmDone}>{ch.doneKm.toFixed(1)}</Text>
                  <Text style={s.challengeKmSep}> / </Text>
                  <Text style={s.challengeKmGoal}>{ch.goalKm} km</Text>
                  <Text style={s.challengePct}> · {ch.pct}%</Text>
                </View>

                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${Math.min(ch.pct, 100)}%` as any }]} />
                </View>

                <View style={s.challengeFooter}>
                  {ch.daysLeft > 0 ? (
                    <>
                      <View style={s.challengeStat}>
                        <Text style={s.challengeStatValue}>{ch.daysLeft}</Text>
                        <Text style={s.challengeStatLabel}>dias restantes</Text>
                      </View>
                      <View style={s.challengeStatDivider} />
                      <View style={s.challengeStat}>
                        <Text style={[s.challengeStatValue, { color: colors.brand }]}>
                          {ch.kmPerDayNeeded.toFixed(1)}
                        </Text>
                        <Text style={s.challengeStatLabel}>km/dia necessários</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={s.challengeFinished}>
                      {ch.pct >= 100 ? '🏅 Meta batida!' : 'Desafio encerrado'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Strava description */}
          {st?.description ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>DESCRIÇÃO</Text>
              <View style={s.descCard}>
                <Text style={s.descText}>{st.description}</Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backArrow: { fontSize: 20, color: colors.brand },
  backLabel: { fontFamily: font.bodyBold, fontSize: 13, color: colors.brand },

  pillValid: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.brand,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillInvalid: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  errorText: { fontFamily: font.body, fontSize: 14, color: colors.textMute },

  actHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  actDate: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  actTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: colors.text,
    lineHeight: 38,
    letterSpacing: 0.4,
  },
  sourceTag: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.brand,
    marginTop: 4,
  },
  skipBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  skipText: { fontFamily: font.body, fontSize: 12, color: colors.danger },

  // Hero card
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  heroKm: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 72,
    color: colors.text,
    lineHeight: 74,
    letterSpacing: 1,
  },
  heroKmUnit: {
    fontFamily: font.body,
    fontSize: 18,
    color: colors.textMute,
  },
  heroDivider: {
    width: '80%',
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 16,
  },
  heroRow: { flexDirection: 'row', width: '100%' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: colors.line, marginHorizontal: 8 },
  heroStatValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.text,
    lineHeight: 28,
    letterSpacing: 0.4,
  },
  heroStatLabel: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    marginTop: 4,
    textAlign: 'center',
  },

  // Section
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
  },
  statItem: {
    width: '50%',
    padding: 16,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: colors.text,
    lineHeight: 30,
    letterSpacing: 0.3,
  },
  statUnit: { fontFamily: font.body, fontSize: 11, color: colors.textMute },
  statLabel: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    marginTop: 2,
  },

  // Splits
  splitsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  splitsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    alignItems: 'center',
  },
  splitRowLast: { borderBottomWidth: 0 },
  splitCol: {
    width: 36,
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.textMute,
  },
  splitColMid: { flex: 1 },
  splitColRight: { width: 64, textAlign: 'right' },
  splitPace: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  splitElev: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
  },
  splitHr: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
  },

  // Challenge card
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
  },
  challengeTitle: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  challengeKmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  challengeKmDone: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: colors.text,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  challengeKmSep: {
    fontFamily: font.body,
    fontSize: 18,
    color: colors.textMute,
  },
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

  // Description
  descCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  descText: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textDim,
    lineHeight: 20,
  },
});
