import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTransition } from '../../../src/components/ScreenTransition';
import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

const TEST_NOTIFICATIONS = [
  {
    title: '⚡ Novo recorde pessoal!',
    body: 'Você bateu seu melhor pace: 4\'32"/km. Continue assim!',
  },
  { title: '🔥 Metade do caminho!', body: '30.5km de 60km. Você está na metade da meta!' },
  {
    title: '🏆 Meta alcançada!',
    body: 'Você completou os 60km do DESAFIO 60K! Sua medalha está a caminho.',
  },
];

async function fireTestNotification(idx: number) {
  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: TEST_NOTIFICATIONS[idx].title,
        body: TEST_NOTIFICATIONS[idx].body,
        sound: 'default',
      },
      trigger: null,
    });
  } catch {}
}

interface Activity {
  id: string;
  title: string;
  distanceKm: number;
  pace: string | null;
  source: string;
  counts: boolean;
  skipReason: string | null;
  startedAt: string;
}

interface Challenge {
  goalKm: number;
  doneKm: number;
  pct: number;
  title: string;
}

interface ProfileData {
  challenge: Challenge;
  strava: { connected: boolean };
}

interface Summary {
  current: {
    year: number;
    month: number;
    totalKm: number;
    runCount: number;
    longestKm: number;
    activeDays: number;
    avgPaceFmt: string | null;
  };
  previous: {
    year: number;
    month: number;
  };
  delta: {
    totalKm: number | null;
    runCount: number | null;
    longestKm: number | null;
    activeDays: number | null;
    avgPaceSec: number | null;
  };
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function parsePaceSeconds(pace: string): number | null {
  const m = pace.match(/^(\d+)'(\d+)["″]?$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function formatPace(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `hoje · ${time}`;
  if (diff === 1) return `ontem · ${time}`;
  const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  if (diff < 7) return `${weekdays[d.getDay()]} · ${time}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <View style={[sd.badge, up ? sd.badgeUp : sd.badgeDown]}>
      <Text style={[sd.badgeText, { color: up ? colors.success : colors.danger }]}>
        {up ? '↑' : '↓'} {Math.abs(value)}%
      </Text>
    </View>
  );
}

function SummaryMetric({
  value,
  label,
  delta,
}: {
  value: string;
  label: string;
  delta: number | null;
}) {
  return (
    <View style={sd.metric}>
      <View style={sd.metricTop}>
        <Text style={sd.metricValue}>{value}</Text>
        <DeltaBadge value={delta} />
      </View>
      <Text style={sd.metricLabel}>{label}</Text>
    </View>
  );
}

function SummaryCard({ summary }: { summary: Summary }) {
  const router = useRouter();
  const prevLabel = `${MONTHS[summary.previous.month - 1]} ${summary.previous.year}`.toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [sd.card, pressed && { opacity: 0.8 }]}
      onPress={() => router.push('/runs/charts')}
    >
      <View style={sd.cardHeader}>
        <Text style={sd.cardTitle}>EVOLUÇÃO MENSAL</Text>
        <Text style={sd.cardSub}>vs {prevLabel}</Text>
      </View>

      <View style={sd.grid}>
        <SummaryMetric
          value={`${summary.current.totalKm.toFixed(1)} km`}
          label="Total"
          delta={summary.delta.totalKm}
        />
        <SummaryMetric
          value={String(summary.current.runCount)}
          label="Corridas"
          delta={summary.delta.runCount}
        />
        <SummaryMetric
          value={summary.current.avgPaceFmt ?? '—'}
          label="Pace médio"
          delta={summary.delta.avgPaceSec}
        />
        <SummaryMetric
          value={`${summary.current.longestKm.toFixed(1)} km`}
          label="Mais longa"
          delta={summary.delta.longestKm}
        />
        <SummaryMetric
          value={String(summary.current.activeDays)}
          label="Dias ativos"
          delta={summary.delta.activeDays}
        />
      </View>

      <View style={sd.cardFooter}>
        <Text style={sd.cardCta}>Ver gráficos →</Text>
      </View>
    </Pressable>
  );
}

function RunnerIcon({ valid }: { valid: boolean }) {
  const stroke = valid ? colors.brand : colors.textMute;
  const bg = valid ? 'rgba(95,184,168,0.12)' : 'rgba(255,255,255,0.04)';
  const border = valid ? 'rgba(95,184,168,0.28)' : colors.line;
  return (
    <View style={[s.actIcon, { backgroundColor: bg, borderColor: border }]}>
      <Text style={{ color: stroke, fontSize: 18 }}>🏃</Text>
    </View>
  );
}

function ActivityRow({ act }: { act: Activity }) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [s.actRow, pressed && { opacity: 0.7 }]}
      onPress={() => router.push(`/runs/${act.id}`)}
    >
      <RunnerIcon valid={act.counts} />
      <View style={s.actInfo}>
        <Text style={s.actTitle} numberOfLines={1}>
          {act.title}
        </Text>
        <Text style={s.actMeta}>
          {formatDate(act.startedAt)} · {act.source}
          {!act.counts && act.skipReason ? (
            <Text style={s.actReason}> · {act.skipReason}</Text>
          ) : null}
        </Text>
      </View>
      <View style={s.actRight}>
        <Text style={s.actKm}>
          {act.distanceKm.toFixed(1)}
          <Text style={s.actKmUnit}> km</Text>
        </Text>
        {act.counts ? (
          <Text style={s.pillValid}>✓ CONTA</Text>
        ) : (
          <Text style={s.pillInvalid}>NÃO CONTA</Text>
        )}
      </View>
    </Pressable>
  );
}

function StatBox({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={s.statBox}>
      <View style={s.statValueRow}>
        <Text style={s.statValue}>{value}</Text>
        {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function RunsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const now = new Date();

  const { data: activities, isLoading: loadingActs } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => api.get('/activities').then((r) => r.data as Activity[]),
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((r) => r.data as ProfileData),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ['activities-summary', now.getFullYear(), now.getMonth() + 1],
    queryFn: () =>
      api
        .get('/activities/summary', {
          params: { year: now.getFullYear(), month: now.getMonth() + 1 },
        })
        .then((r) => r.data as Summary),
  });

  const monthLabel = now
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .toUpperCase();

  const validActs = activities?.filter((a) => a.counts) ?? [];
  const totalKm = validActs.reduce((s, a) => s + a.distanceKm, 0);
  const validCount = validActs.length;

  const paceSeconds = validActs
    .map((a) => (a.pace ? parsePaceSeconds(a.pace) : null))
    .filter((s): s is number => s !== null);
  const avgPace =
    paceSeconds.length > 0
      ? formatPace(paceSeconds.reduce((a, b) => a + b, 0) / paceSeconds.length)
      : '—';

  const pct = profile?.challenge?.pct ?? 0;
  const goalKm = profile?.challenge?.goalKm ?? 0;

  const isLoading = loadingActs || loadingProfile;

  return (
    <ScreenTransition>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Text style={s.kicker}>{monthLabel}</Text>
          <Text style={s.screenTitle}>MINHAS CORRIDAS</Text>
        </View>

        {/* DEBUG — remover antes do submit */}
        <View style={s.debugPanel}>
          <Text style={s.debugLabel}>🔔 TESTAR NOTIFICAÇÕES</Text>
          <View style={s.debugRow}>
            {TEST_NOTIFICATIONS.map((n, i) => (
              <Pressable key={i} style={s.debugBtn} onPress={() => fireTestNotification(i)}>
                <Text style={s.debugBtnText}>{n.title.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <>
            {/* Stats card */}
            <View style={s.statsCard}>
              <View style={s.statsGrid}>
                <StatBox value={totalKm.toFixed(1)} unit="km" label="Total mês" />
                <StatBox value={String(validCount)} label="Atividades válidas" />
                <StatBox value={avgPace} label="Pace médio" />
                <StatBox value={`${Math.round(pct)}%`} label="Da meta" />
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any }]} />
              </View>
              <Text style={s.barLabel}>
                {totalKm.toFixed(1)} / {goalKm} km
              </Text>
            </View>

            {/* Evolução mensal */}
            {summary && (
              <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                <SummaryCard summary={summary} />
              </View>
            )}

            {/* Sync banner */}
            {profile?.strava?.connected && (
              <View style={s.syncBanner}>
                <View style={s.syncDot} />
                <View style={s.syncInfo}>
                  <Text style={s.syncTitle}>Sincronizando com Strava</Text>
                  <Text style={s.syncSub}>Atividades importadas automaticamente</Text>
                </View>
                <Text style={s.syncOk}>OK</Text>
              </View>
            )}

            {/* History */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionKicker}>{monthLabel}</Text>
              <Text style={s.sectionTitle}>HISTÓRICO</Text>
            </View>

            <View style={s.list}>
              {activities && activities.length > 0 ? (
                activities.map((act) => <ActivityRow key={act.id} act={act} />)
              ) : (
                <View style={s.empty}>
                  <Text style={s.emptyText}>Nenhuma atividade este mês.</Text>
                  <Text style={s.emptyHint}>
                    Conecte o Strava no Perfil para importar automaticamente.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB — start a new run */}
      <Pressable
        style={[s.fab, { bottom: Math.max(insets.bottom, 8) + 8 + 68 + 12 }]}
        onPress={() => router.push('/runs/tracker')}
      >
        <Text style={s.fabText}>CORRER</Text>
      </Pressable>
    </ScreenTransition>
  );
}

// Summary card styles
const sd = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  cardSub: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    width: '47%',
    backgroundColor: colors.bgElev,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  metricLabel: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.3,
  },
  cardFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  cardCta: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 0.5,
  },
  badge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeUp: { backgroundColor: 'rgba(61,220,132,0.12)' },
  badgeDown: { backgroundColor: 'rgba(255,107,107,0.12)' },
  badgeText: {
    fontFamily: font.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  kicker: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 2,
  },
  screenTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 44,
    color: colors.text,
    lineHeight: 46,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  statsCard: {
    margin: 20,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    rowGap: 20,
  },
  statBox: { width: '50%' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: colors.text,
    letterSpacing: 0.4,
    lineHeight: 34,
  },
  statUnit: { fontFamily: font.body, fontSize: 11, color: colors.textMute },
  statLabel: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: colors.brand, borderRadius: 3 },
  barLabel: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    marginTop: 6,
    textAlign: 'right',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(61,220,132,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(61,220,132,0.2)',
  },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  syncInfo: { flex: 1 },
  syncTitle: { fontFamily: font.bodyBold, fontSize: 12, color: colors.text },
  syncSub: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 1 },
  syncOk: { fontFamily: font.bodyBold, fontSize: 11, color: colors.success, letterSpacing: 1 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionKicker: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.brand,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  list: { paddingHorizontal: 20, gap: 8 },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actInfo: { flex: 1, minWidth: 0 },
  actTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text },
  actMeta: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  actReason: { color: colors.danger },
  actRight: { alignItems: 'flex-end', flexShrink: 0 },
  actKm: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    lineHeight: 24,
    letterSpacing: 0.4,
  },
  actKmUnit: { fontFamily: font.body, fontSize: 11, color: colors.textMute },
  pillValid: {
    fontFamily: font.bodyBold,
    fontSize: 9,
    color: colors.brand,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  pillInvalid: {
    fontFamily: font.bodyBold,
    fontSize: 9,
    color: colors.textMute,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.textMute },
  emptyHint: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 18,
  },
  debugPanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.3)',
    backgroundColor: 'rgba(255,200,0,0.06)',
    gap: 10,
  },
  debugLabel: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: 'rgba(255,200,0,0.8)',
    letterSpacing: 1,
  },
  debugRow: { flexDirection: 'row', gap: 8 },
  debugBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,200,0,0.12)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.2)',
  },
  debugBtnText: { fontFamily: font.bodyBold, fontSize: 18 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.brand,
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.brandInk,
    letterSpacing: 3,
  },
});
