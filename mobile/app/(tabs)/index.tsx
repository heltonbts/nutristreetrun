import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChallengePickerScreen } from '../../src/screens/ChallengePickerScreen';
import { ScreenTransition } from '../../src/components/ScreenTransition';
import Svg, {
  Circle,
  Defs,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';

const W = Dimensions.get('window').width;

const MONTHS = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO',
];

function monthLabel() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
}

function fmtSource(src: string) {
  if (src === 'STRAVA') return 'Strava';
  if (src === 'HEALTH') return 'Apple Health';
  return src;
}

function Medal({ size = 88, label }: { size?: number; label: string }) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const innerR = r - 5;
  const innerPts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + innerR * Math.cos(a)).toFixed(1)},${(cy + innerR * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Polygon points={hexPts} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
        <Polygon points={innerPts} fill="rgba(255,255,255,0.02)" />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: size * 0.3, color: colors.text, lineHeight: size * 0.33 }}>
          {label}
        </Text>
        <Text style={{ fontFamily: font.bodyBold, fontSize: size * 0.09, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, marginTop: 2 }}>
          NSR
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({ kicker, title, action, onAction }: {
  kicker: string; title: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={sh.row}>
      <View>
        <Text style={sh.kicker}>{kicker}</Text>
        <Text style={sh.title}>{title}</Text>
      </View>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={12}>
          <Text style={sh.action}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function RunIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 22 22" fill="none">
      <Circle cx="14.5" cy="3.5" r="2" stroke={color} strokeWidth="1.8" />
      <Path
        d="M5 18l3-3 2-3 3 1 3 5M9 11l-2-3-3 2M13 13l3-2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface HomeData {
  userName: string;
  challenge: { id: string; title: string; goalKm: number; doneKm: number; pct: number; daysLeft: number } | null;
  ranking: { pos: number; aheadKm: number; total: number } | null;
  recentActivities: {
    id: string;
    title: string;
    distanceKm: number;
    pace: string | null;
    source: string;
    counts: boolean;
    skipReason: string | null;
    startedAt: string;
  }[];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  const { data, isLoading } = useQuery<HomeData>({
    queryKey: ['home'],
    queryFn: () => api.get('/home').then((r) => r.data as HomeData),
  });

  if (showPicker) {
    return (
      <ChallengePickerScreen
        onBack={() => setShowPicker(false)}
        onJoined={() => setShowPicker(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={s.muted}>Carregando...</Text>
      </View>
    );
  }

  const c = data?.challenge;
  const r = data?.ranking;
  const goalLabel = c ? `${c.goalKm}K` : '—';
  const firstName = data?.userName?.split(' ')[0] ?? '';

  /* ── Empty state: sem desafio ── */
  if (!c) {
    return (
      <ScreenTransition>
        <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Hero vazio */}
          <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
            <Svg width={W} height={260} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <RadialGradient id="rg2" cx="90%" cy="0%" r="65%">
                  <Stop offset="0%" stopColor="#5FB8A8" stopOpacity="0.18" />
                  <Stop offset="100%" stopColor="#5FB8A8" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width={W} height={260} fill="url(#rg2)" />
            </Svg>

            <View style={s.heroTop}>
              <View style={s.syncChip}>
                <View style={s.syncDot} />
                <Text style={s.syncText}>STRAVA · HEALTH SYNC</Text>
              </View>
              <Text style={s.monthLabel}>{monthLabel()}</Text>
            </View>

            {/* Medalha dashed placeholder (canto direito) */}
            <View style={s.medalPlaceholder}>
              <Text style={s.medalPlaceholderText}>?</Text>
            </View>

            <Text style={s.kicker}>Olá, {firstName}</Text>
            <Text style={[s.challengeTitle, { fontSize: 48, lineHeight: 48 }]}>
              {'ESCOLHA\nSEU\nDESAFIO.'}
            </Text>
            <Text style={[s.challengeSub, { marginTop: 14, maxWidth: 280 }]}>
              Você ainda não entrou no desafio de {monthLabel().toLowerCase()}. Escolha sua meta de km — só uma medalha por mês.
            </Text>

            <Pressable style={s.pickBtn} onPress={() => setShowPicker(true)}>
              <Text style={s.pickBtnText}>ESCOLHER DESAFIO  →</Text>
            </Pressable>
            <Text style={s.pickHint}>Inscrição inclusa no plano · termina em {c?.daysLeft ?? data?.challenge?.daysLeft ?? 26} dias</Text>
          </View>

          {/* Preview horizontal das metas */}
          <View style={s.section}>
            <Text style={s.sectionMiniLabel}>METAS DISPONÍVEIS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
              {[30, 60, 100, 150].map((km) => (
                <Pressable key={km} style={s.previewCard} onPress={() => setShowPicker(true)}>
                  <Text style={s.previewKm}>{km}K</Text>
                  <Text style={s.previewPace}>{km === 30 ? 'INICIANTE' : km === 60 ? 'MÉDIO' : km === 100 ? 'AVANÇADO' : 'ELITE'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Atividades recentes mesmo sem desafio */}
          {(data?.recentActivities ?? []).length > 0 && (
            <View style={s.section}>
              <SectionHeader kicker="ÚLTIMA SEMANA" title="ATIVIDADES" action="Ver corridas →" onAction={() => router.push('/(tabs)/runs')} />
              <View style={{ gap: 8 }}>
                {data?.recentActivities.map((a) => (
                  <View key={a.id} style={s.actRow}>
                    <View style={[s.actIcon, { backgroundColor: a.counts ? 'rgba(95,184,168,0.12)' : 'rgba(255,255,255,0.04)', borderColor: a.counts ? 'rgba(95,184,168,0.28)' : colors.line }]}>
                      <RunIcon color={a.counts ? colors.brand : colors.textMute} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.actTitle} numberOfLines={1}>{a.title}</Text>
                      <Text style={s.actMeta}>{fmtDate(a.startedAt)} · {fmtSource(a.source)}</Text>
                    </View>
                    <Text style={s.actKm}>{a.distanceKm.toFixed(1)} <Text style={s.actKmUnit}>km</Text></Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </ScreenTransition>
    );
  }

  return (
    <ScreenTransition>
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* ── HERO BANNER ── */}
      <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
        {/* Radial gradient background */}
        <Svg width={W} height={260} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="rg" cx="90%" cy="0%" r="65%">
              <Stop offset="0%" stopColor="#5FB8A8" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#5FB8A8" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={W} height={260} fill="url(#rg)" />
        </Svg>

        {/* Sync chip + month */}
        <View style={s.heroTop}>
          <View style={s.syncChip}>
            <View style={s.syncDot} />
            <Text style={s.syncText}>STRAVA · HEALTH SYNC</Text>
          </View>
          <Text style={s.monthLabel}>{monthLabel()}</Text>
        </View>

        {/* Title row */}
        <View style={s.titleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.kicker}>DESAFIO ATIVO</Text>
            <Text style={s.challengeTitle}>{c?.title ?? '—'}</Text>
            <Text style={s.challengeSub}>Complete {c?.goalKm} km para ganhar sua medalha</Text>
          </View>
          <Medal size={88} label={goalLabel} />
        </View>

        {/* Progress */}
        <View style={s.progressBlock}>
          <View style={s.progressRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={s.kmDone}>{c?.doneKm.toFixed(1)}</Text>
              <Text style={s.kmOf}>/ {c?.goalKm} km</Text>
            </View>
            <Text style={s.pctLabel}>{c?.pct}% COMPLETO</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${c?.pct ?? 0}%` }]} />
          </View>
          <View style={s.progressFooter}>
            <Text style={s.muted}>Faltam <Text style={s.textWhite}>{((c?.goalKm ?? 0) - (c?.doneKm ?? 0)).toFixed(1)} km</Text></Text>
            <Text style={s.muted}><Text style={s.textBrand}>{c?.daysLeft} dias</Text> restantes</Text>
          </View>
        </View>
      </View>

      {/* ── RANKING ── */}
      {r && r.total > 0 && (
        <View style={s.section}>
          <SectionHeader
            kicker="SUA POSIÇÃO"
            title="RANKING"
            action="Ver tudo →"
            onAction={() => router.push('/(tabs)/ranking')}
          />
          <View style={s.card}>
            <Text style={s.rankPos}>#{r.pos}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rankLabel}>Você está em {r.pos}º lugar</Text>
              <Text style={s.muted}>
                {r.aheadKm > 0
                  ? `${r.aheadKm} km para o ${r.pos - 1}º lugar`
                  : `Líder entre ${r.total} participantes`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── ATIVIDADES ── */}
      {(data?.recentActivities ?? []).length > 0 && (
        <View style={s.section}>
          <SectionHeader
            kicker="ÚLTIMA SEMANA"
            title="ATIVIDADES"
            action="Ver corridas →"
            onAction={() => router.push('/(tabs)/runs')}
          />
          <View style={{ gap: 8 }}>
            {data?.recentActivities.map((a) => (
              <View key={a.id} style={s.actRow}>
                <View style={[s.actIcon, { backgroundColor: a.counts ? 'rgba(95,184,168,0.12)' : 'rgba(255,255,255,0.04)', borderColor: a.counts ? 'rgba(95,184,168,0.28)' : colors.line }]}>
                  <RunIcon color={a.counts ? colors.brand : colors.textMute} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.actTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={s.actMeta}>
                    {fmtDate(a.startedAt)} · {fmtSource(a.source)}
                    {!a.counts && a.skipReason
                      ? <Text style={{ color: colors.danger }}> · {a.skipReason}</Text>
                      : null}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.actKm}>{a.distanceKm.toFixed(1)} <Text style={s.actKmUnit}>km</Text></Text>
                  <Text style={[s.actCounts, { color: a.counts ? colors.brand : colors.textMute }]}>
                    {a.counts ? '✓ CONTA' : 'NÃO CONTA'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  // Hero
  hero: {
    backgroundColor: '#0E1110',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    padding: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  syncText: { fontFamily: font.bodyBold, fontSize: 10, color: colors.textDim, letterSpacing: 1.2 },
  monthLabel: { fontFamily: font.bodyBold, fontSize: 11, color: colors.textMute, letterSpacing: 1.4 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2, marginBottom: 6 },
  challengeTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 52,
    lineHeight: 54,
    color: colors.text,
    letterSpacing: 1,
  },
  challengeSub: { fontFamily: font.body, fontSize: 13, color: colors.textDim, marginTop: 8, lineHeight: 18 },

  progressBlock: { marginTop: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  kmDone: { fontFamily: 'BebasNeue_400Regular', fontSize: 38, color: colors.text, lineHeight: 38 },
  kmOf: { fontFamily: font.body, fontSize: 14, color: colors.textDim },
  pctLabel: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brand, letterSpacing: 1 },
  barBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.brand, borderRadius: 999 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },

  // Common
  muted: { fontFamily: font.body, fontSize: 12, color: colors.textDim },
  textWhite: { color: colors.text, fontFamily: font.bodyBold },
  textBrand: { color: colors.brand, fontFamily: font.bodyBold },

  // Empty state
  medalPlaceholder: {
    position: 'absolute', top: 56, right: 16,
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: colors.lineHi, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', opacity: 0.6,
  },
  medalPlaceholderText: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: colors.textMute, letterSpacing: 2,
  },
  pickBtn: {
    backgroundColor: colors.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 24,
  },
  pickBtnText: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.brandInk, letterSpacing: 1,
  },
  pickHint: {
    fontFamily: font.body, fontSize: 11, color: colors.textMute,
    textAlign: 'center', marginTop: 12, letterSpacing: 0.4,
  },
  sectionMiniLabel: {
    fontFamily: font.bodyBold, fontSize: 11, color: colors.textMute, letterSpacing: 1.6, marginBottom: 14,
  },
  previewCard: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, minWidth: 110,
  },
  previewKm: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: colors.text, lineHeight: 30, letterSpacing: 0.4,
  },
  previewPace: {
    fontFamily: font.bodyBold, fontSize: 10, color: colors.textMute, marginTop: 6, letterSpacing: 0.8,
  },

  // Sections
  section: { padding: 20, paddingBottom: 4 },

  // Ranking card
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  rankPos: { fontFamily: 'BebasNeue_400Regular', fontSize: 44, color: colors.brand },
  rankLabel: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },

  // Activity rows
  actRow: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  actIcon: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  actTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text },
  actMeta: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  actKm: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.text, lineHeight: 22 },
  actKmUnit: { fontFamily: font.body, fontSize: 11, color: colors.textDim },
  actCounts: { fontFamily: font.bodyBold, fontSize: 9, letterSpacing: 0.8, marginTop: 3 },
});

const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 1.6, marginBottom: 4 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: colors.text },
  action: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brand, letterSpacing: 0.4 },
});
