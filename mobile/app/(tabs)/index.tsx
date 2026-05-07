import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HomeData {
  challenge: { title: string; goalKm: number; doneKm: number; pct: number; daysLeft: number };
  ranking: { pos: number; aheadKm: number; total: number };
  recentActivities: { id: string; title: string; distanceKm: number; pace: string | null; counts: boolean; skipReason: string | null }[];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery<HomeData>({
    queryKey: ['home'],
    queryFn: () => api.get('/home').then((r) => r.data as HomeData),
  });

  if (isLoading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><Text style={s.muted}>Carregando...</Text></View>;
  }

  const c = data?.challenge;
  const r = data?.ranking;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 32 }}>
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.kicker}>DESAFIO ATIVO</Text>
        <Text style={s.title}>{c?.title}</Text>
        <Text style={s.sub}>Corra {c?.goalKm} km até o fim do mês</Text>

        {/* Progress */}
        <View style={s.progressRow}>
          <Text style={s.km}>{c?.doneKm.toFixed(1)}</Text>
          <Text style={s.kmLabel}>/ {c?.goalKm} km</Text>
          <Text style={[s.pct, { marginLeft: 'auto' }]}>{c?.pct}% COMPLETO</Text>
        </View>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${c?.pct ?? 0}%` }]} />
        </View>
        <View style={s.progressFooter}>
          <Text style={s.muted}>Faltam <Text style={s.textWhite}>{((c?.goalKm ?? 0) - (c?.doneKm ?? 0)).toFixed(1)} km</Text></Text>
          <Text style={s.muted}><Text style={s.textBrand}>{c?.daysLeft} dias</Text> restantes</Text>
        </View>
      </View>

      {/* Ranking */}
      {r && r.total > 0 && (
        <View style={s.section}>
          <Text style={s.sectionKicker}>SUA POSIÇÃO</Text>
          <Text style={s.sectionTitle}>RANKING</Text>
          <View style={s.card}>
            <Text style={s.rankPos}>#{r.pos}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rankLabel}>Você está em {r.pos}º lugar</Text>
              {r.aheadKm > 0 && <Text style={s.muted}>{r.aheadKm} km para o {r.pos - 1}º</Text>}
            </View>
          </View>
        </View>
      )}

      {/* Atividades recentes */}
      {(data?.recentActivities ?? []).length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionKicker}>ÚLTIMA SEMANA</Text>
          <Text style={s.sectionTitle}>ATIVIDADES</Text>
          <View style={{ gap: 8 }}>
            {data?.recentActivities.map((a) => (
              <View key={a.id} style={s.actRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.actTitle}>{a.title}</Text>
                  {!a.counts && <Text style={s.actSkip}>{a.skipReason}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.actKm}>{a.distanceKm.toFixed(1)} km</Text>
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
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 56, color: colors.text, lineHeight: 56, marginTop: 4 },
  sub: { fontFamily: font.body, fontSize: 13, color: colors.textDim, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 20, gap: 6 },
  km: { fontFamily: 'BebasNeue_400Regular', fontSize: 38, color: colors.text },
  kmLabel: { fontFamily: font.body, fontSize: 14, color: colors.textDim },
  pct: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brand, letterSpacing: 1 },
  barBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.brand, borderRadius: 999 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  muted: { fontFamily: font.body, fontSize: 12, color: colors.textDim },
  textWhite: { color: colors.text, fontFamily: font.bodyBold },
  textBrand: { color: colors.brand, fontFamily: font.bodyBold },
  section: { padding: 20 },
  sectionKicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 1.6, marginBottom: 4 },
  sectionTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: colors.text, marginBottom: 14 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankPos: { fontFamily: 'BebasNeue_400Regular', fontSize: 44, color: colors.brand },
  rankLabel: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },
  actRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text },
  actSkip: { fontFamily: font.body, fontSize: 11, color: colors.danger, marginTop: 2 },
  actKm: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.text },
  actCounts: { fontFamily: font.bodyBold, fontSize: 9, letterSpacing: 0.8, marginTop: 2 },
});
