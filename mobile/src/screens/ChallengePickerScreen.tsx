import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { floatingTabBarSpace } from '../components/FloatingTabBar';
import { api } from '../lib/api';
import { colors, font } from '../lib/tokens';

interface Challenge {
  id: string;
  year: number;
  month: number;
  title: string;
  goalKm: number;
  startsAt: string;
  endsAt: string;
}

interface Props {
  onBack: () => void;
  onJoined: () => void;
}

const PACE_LABEL: Record<number, string> = {
  30: 'INICIANTE',
  60: 'MÉDIO',
  100: 'AVANÇADO',
  150: 'ELITE',
};

const PACE_DESC: Record<number, string> = {
  30: 'Começando agora? 1 km por dia bate. Bora.',
  60: 'Pra quem corre 3-4x por semana. Cerca de 15 km / semana.',
  100: 'Pra quem treina pra prova. Mais de 20 km / semana.',
  150: 'Volume de maratonista. Não é pra qualquer um.',
};

const POPULAR_KM = 60;

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function paceLabel(km: number) {
  return PACE_LABEL[km] ?? `${km}K`;
}

function paceDesc(km: number) {
  return PACE_DESC[km] ?? `Complete ${km} km no mês.`;
}

export function ChallengePickerScreen({ onBack, onJoined }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const { data: challenges, isLoading } = useQuery<Challenge[]>({
    queryKey: ['challenges-current'],
    queryFn: () => api.get('/challenges/current').then((r) => r.data as Challenge[]),
    onSuccess: (data: Challenge[]) => {
      if (data.length > 0 && !selectedId) {
        const popular = data.find((c: Challenge) => c.goalKm === POPULAR_KM) ?? data[0];
        setSelectedId(popular.id);
      }
    },
  } as any);

  const selected = challenges?.find((c) => c.id === selectedId);
  const now = new Date();
  const monthLabel = `${MONTHS[now.getMonth()]} · ${now.getFullYear()}`;

  async function handleJoin() {
    if (!selectedId) return;
    setJoining(true);
    try {
      await api.post('/challenges/join', { challengeId: selectedId });
      await queryClient.invalidateQueries({ queryKey: ['home'] });
      onJoined();
    } catch {
      Alert.alert('Erro', 'Não foi possível entrar no desafio. Tente novamente.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.kicker}>{monthLabel}</Text>
        <Text style={s.title}>ESCOLHA SUA META</Text>
        <Text style={s.subtitle}>
          Você fica nesse desafio até o fim do mês. Bata a meta, ganhe a medalha.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
        ) : challenges?.length === 0 ? (
          <Text style={s.empty}>Nenhum desafio disponível no momento.</Text>
        ) : (
          challenges?.map((c) => {
            const isSel = c.id === selectedId;
            const isPopular = c.goalKm === POPULAR_KM;
            return (
              <Pressable
                key={c.id}
                style={[s.card, isSel && s.cardSelected]}
                onPress={() => setSelectedId(c.id)}
              >
                {isPopular && (
                  <View style={s.popularBadge}>
                    <Text style={s.popularText}>MAIS ESCOLHIDO</Text>
                  </View>
                )}
                <View style={s.cardRow}>
                  <View style={[s.kmBox, isSel && s.kmBoxSelected]}>
                    <Text style={[s.kmLabel, isSel && s.kmLabelSelected]}>{c.goalKm}K</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.kmTitleRow}>
                      <Text style={s.kmKm}>{c.goalKm} KM</Text>
                      <Text style={s.kmPace}> · {paceLabel(c.goalKm)}</Text>
                    </View>
                    <Text style={s.kmDesc}>{paceDesc(c.goalKm)}</Text>
                  </View>
                  <View style={[s.radio, isSel && s.radioSelected]}>
                    {isSel && <View style={s.radioInner} />}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

        <View style={s.note}>
          <Text style={s.noteText}>
            <Text style={s.noteBold}>Atenção:</Text> a escolha trava no dia 5 do mês. Depois disso,
            só no próximo ciclo.
          </Text>
        </View>
      </ScrollView>

      {/* CTA fixo na base — reserva o espaço da ilha flutuante pra não ficar atrás dela */}
      <View style={[s.footer, { paddingBottom: floatingTabBarSpace(insets.bottom) + 16 }]}>
        <Pressable
          style={[s.ctaBtn, (!selected || joining) && s.ctaBtnDisabled]}
          onPress={handleJoin}
          disabled={!selected || joining}
        >
          {joining ? (
            <ActivityIndicator color={colors.brandInk} />
          ) : (
            <Text style={s.ctaText}>ENTRAR NO {selected ? `${selected.goalKm}K` : '—'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  backArrow: { color: colors.text, fontSize: 26, lineHeight: 30 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2 },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 44,
    color: colors.text,
    lineHeight: 46,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textDim,
    marginTop: 8,
    lineHeight: 20,
  },

  list: { padding: 20, paddingTop: 16, gap: 10 },

  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: 'rgba(95,184,168,0.10)',
    borderColor: colors.brand,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 14,
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularText: { fontFamily: font.bodyBold, fontSize: 9, color: colors.brandInk, letterSpacing: 1 },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kmBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kmBoxSelected: { backgroundColor: colors.brand },
  kmLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.4,
  },
  kmLabelSelected: { color: colors.brandInk },

  kmTitleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  kmKm: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.4,
    lineHeight: 24,
  },
  kmPace: { fontFamily: font.bodyBold, fontSize: 10, color: colors.textMute, letterSpacing: 1 },
  kmDesc: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
    lineHeight: 17,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.lineHi,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: { borderColor: colors.brand, backgroundColor: colors.brand },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandInk },

  note: {
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: 'rgba(95,184,168,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.18)',
  },
  noteText: { fontFamily: font.body, fontSize: 11, color: colors.textDim, lineHeight: 17 },
  noteBold: { fontFamily: font.bodyBold, color: colors.text },

  empty: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.textMute,
    textAlign: 'center',
    marginTop: 40,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ctaBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.brandInk,
    letterSpacing: 1,
  },
});
