import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../src/lib/api';
import {
  type ImportableWorkout,
  queryRunningWorkouts,
  requestHealthKitPermissions,
} from '../../../src/lib/healthKit';
import { colors, font } from '../../../src/lib/tokens';

type Phase = 'loading' | 'list' | 'importing' | 'unavailable';

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function fmtDate(d: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `hoje · ${time}`;
  if (diff === 1) return `ontem · ${time}`;
  const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  if (diff < 7) return `${weekdays[d.getDay()]} · ${time}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · ${time}`;
}

export default function ImportRunsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('loading');
  const [workouts, setWorkouts] = useState<ImportableWorkout[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setPhase('unavailable');
      return;
    }
    setPhase('loading');
    await requestHealthKitPermissions();
    const list = await queryRunningWorkouts(90);
    setWorkouts(list);
    // Pré-seleciona tudo — caminho comum é importar todas.
    setSelected(Object.fromEntries(list.map((w) => [w.uuid, true])));
    setPhase('list');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  function toggle(uuid: string) {
    setSelected((prev) => ({ ...prev, [uuid]: !prev[uuid] }));
  }

  async function importSelected() {
    const toImport = workouts.filter((w) => selected[w.uuid]);
    if (toImport.length === 0) return;
    setPhase('importing');

    let imported = 0;
    let duplicates = 0;
    let failed = 0;

    for (const w of toImport) {
      try {
        const res = await api.post<{ duplicate?: boolean }>('/activities', {
          distanceKm: w.distanceKm,
          durationSeconds: w.durationSec,
          startedAt: w.startedAt.toISOString(),
          source: 'AppleHealth',
          externalId: w.uuid,
          ...(w.calories > 0 && { caloriesBurned: w.calories }),
          ...(w.isIndoor && { surface: 'esteira' }),
        });
        if (res.data?.duplicate) duplicates += 1;
        else imported += 1;
      } catch {
        failed += 1;
      }
    }

    void queryClient.invalidateQueries({ queryKey: ['activities'] });
    void queryClient.invalidateQueries({ queryKey: ['activities-summary'] });

    const parts: string[] = [];
    if (imported > 0) parts.push(`${imported} importada${imported > 1 ? 's' : ''}`);
    if (duplicates > 0) parts.push(`${duplicates} já existia${duplicates > 1 ? 'm' : ''}`);
    if (failed > 0) parts.push(`${failed} falhou`);

    Alert.alert(
      imported > 0 ? 'Pronto!' : 'Nada novo',
      parts.join(' · ') || 'Nenhuma corrida importada.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.back}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>IMPORTAR DO APPLE HEALTH</Text>
        <View style={{ width: 24 }} />
      </View>

      {phase === 'loading' || phase === 'importing' ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={s.centerText}>
            {phase === 'importing' ? 'Importando corridas...' : 'Buscando no Apple Health...'}
          </Text>
        </View>
      ) : phase === 'unavailable' ? (
        <View style={s.center}>
          <Text style={s.centerTitle}>Indisponível</Text>
          <Text style={s.centerText}>
            A importação do Apple Health só está disponível no iPhone.
          </Text>
        </View>
      ) : workouts.length === 0 ? (
        <View style={s.center}>
          <Text style={s.centerTitle}>Nenhuma corrida encontrada</Text>
          <Text style={s.centerText}>
            Não achamos corridas no Apple Health nos últimos 90 dias. Corridas de esteira ou feitas
            no relógio aparecem aqui depois de sincronizarem com o app Saúde.
          </Text>
          <Pressable style={s.retryBtn} onPress={() => void load()}>
            <Text style={s.retryText}>TENTAR DE NOVO</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.hint}>
              Selecione as corridas que quer registrar. Treinos de esteira e feitos só no relógio
              entram aqui.
            </Text>
            {workouts.map((w) => {
              const on = !!selected[w.uuid];
              const paceSec = w.distanceKm > 0 ? w.durationSec / w.distanceKm : 0;
              return (
                <Pressable
                  key={w.uuid}
                  style={[s.row, on && s.rowOn]}
                  onPress={() => toggle(w.uuid)}
                >
                  <View style={[s.check, on && s.checkOn]}>
                    {on && <Text style={s.checkMark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.rowTop}>
                      <Text style={s.rowDist}>{w.distanceKm.toFixed(2)} km</Text>
                      {w.isIndoor && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>ESTEIRA</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.rowMeta}>
                      {fmtDuration(w.durationSec)} · {fmtPace(paceSec)}/km
                      {w.calories > 0 ? ` · ${w.calories} kcal` : ''}
                    </Text>
                    <Text style={s.rowSub}>
                      {fmtDate(w.startedAt)} · {w.sourceName}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              style={[s.importBtn, selectedCount === 0 && { opacity: 0.5 }]}
              onPress={importSelected}
              disabled={selectedCount === 0}
            >
              <Text style={s.importText}>
                {selectedCount > 0
                  ? `IMPORTAR ${selectedCount} CORRIDA${selectedCount > 1 ? 'S' : ''}`
                  : 'SELECIONE PELO MENOS UMA'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  back: { color: colors.text, fontSize: 32, fontFamily: font.body, marginTop: -4 },
  headerTitle: { color: colors.text, fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  centerTitle: { color: colors.text, fontFamily: font.bodyBold, fontSize: 18 },
  centerText: {
    color: colors.textMute,
    fontFamily: font.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: colors.text, fontFamily: font.bodyBold, fontSize: 13, letterSpacing: 1 },
  hint: {
    color: colors.textMute,
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  rowOn: { borderColor: colors.brand, backgroundColor: colors.cardHi },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.lineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkMark: { color: colors.brandInk, fontSize: 15, fontFamily: font.bodyBold },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDist: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: colors.text,
    letterSpacing: 0.4,
  },
  badge: {
    backgroundColor: 'rgba(95,184,168,0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: colors.brand, fontFamily: font.bodyBold, fontSize: 9, letterSpacing: 0.8 },
  rowMeta: { color: colors.textDim, fontFamily: font.bodyMedium, fontSize: 13, marginTop: 2 },
  rowSub: { color: colors.textMute, fontFamily: font.body, fontSize: 11, marginTop: 3 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  importBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  importText: { color: colors.brandInk, fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 1 },
});
