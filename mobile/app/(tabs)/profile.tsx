import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTransition } from '../../src/components/ScreenTransition';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';
import { AddressScreen } from '../../src/screens/AddressScreen';
import { EditProfileScreen } from '../../src/screens/EditProfileScreen';
import { MedalsScreen } from '../../src/screens/MedalsScreen';
import { SubscribeScreen } from '../../src/screens/SubscribeScreen';
import { useAuthStore } from '../../src/store/auth.store';

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string | null;
    state: string | null;
    assessoria: string | null;
    avatarUrl: string | null;
    weightKg: number | null;
    heightCm: number | null;
  };
  challenge: {
    title: string;
    goalKm: number;
    doneKm: number;
    pct: number;
    daysLeft: number;
  } | null;
  medals: {
    id: string;
    year: number;
    month: number;
    title: string;
    goalKm: number;
    status: 'PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'MISSED';
  }[];
  address: {
    zipCode: string | null;
    street: string | null;
    streetNumber: string | null;
    complement: string | null;
    neighborhood: string | null;
    deliveryCity: string | null;
    deliveryState: string | null;
  };
  stats: { totalMedals: number; totalKm: number; monthsActive: number };
  streak: {
    weeks: number;
    activities: number;
    year: number;
    month: number; // 1-based
    monthActiveDays: number[];
  };
}

function ChevronRight() {
  return <Text style={{ color: colors.textMute, fontSize: 16, lineHeight: 20 }}>›</Text>;
}

function SettingRow({
  label,
  sub,
  onPress,
  last,
}: {
  label: string;
  sub?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[s.settingRow, !last && s.settingRowBorder]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        {sub ? <Text style={s.settingSub}>{sub}</Text> : null}
      </View>
      <ChevronRight />
    </Pressable>
  );
}

interface SocialCounts {
  user: { id: string };
  counts: { posts: number; followers: number; following: number };
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];
const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

type StreakData = ProfileData['streak'];

// Calendário mensal com sequência semanal (estilo Strava). Semana começa na
// segunda; dias com atividade ficam preenchidos; o dia de hoje ganha um anel.
function StreakSection({ streak }: { streak: StreakData }) {
  const active = new Set(streak.monthActiveDays);
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === streak.year && now.getMonth() + 1 === streak.month;
  const today = now.getDate();

  // Monta as linhas (semanas) começando na segunda-feira.
  const daysInMonth = new Date(streak.year, streak.month, 0).getDate();
  const firstDow = new Date(streak.year, streak.month - 1, 1).getDay(); // 0=dom
  const leadPad = (firstDow + 6) % 7; // quantos vazios antes do dia 1 (seg=0)

  const cells: (number | null)[] = [
    ...Array(leadPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View>
      <Text style={[s.sectionLabel, { marginTop: 24 }]}>SEQUÊNCIA</Text>
      <View style={s.streakCard}>
        {/* Topo: contadores */}
        <View style={s.streakTop}>
          <View style={s.streakStat}>
            <Text style={s.streakValue}>
              {streak.weeks}
              <Text style={s.streakUnit}> {streak.weeks === 1 ? 'semana' : 'semanas'}</Text>
            </Text>
            <Text style={s.streakStatLabel}>Sua sequência</Text>
          </View>
          <View style={s.streakStat}>
            <Text style={s.streakValue}>{streak.activities}</Text>
            <Text style={s.streakStatLabel}>Atividades na sequência</Text>
          </View>
        </View>

        <Text style={s.streakMonth}>
          {MONTH_NAMES[streak.month - 1]} {streak.year}
        </Text>

        {/* Cabeçalho dos dias da semana */}
        <View style={s.calRow}>
          <View style={s.calDays}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={i} style={s.calWeekday}>
                {w}
              </Text>
            ))}
          </View>
          <View style={s.calWeekCol} />
        </View>

        {/* Linhas do mês */}
        {rows.map((row, ri) => {
          const rowActive = row.some((d) => d != null && active.has(d));
          return (
            <View key={ri} style={s.calRow}>
              <View style={s.calDays}>
                {row.map((d, ci) => {
                  if (d == null) return <View key={ci} style={s.calCell} />;
                  const isActive = active.has(d);
                  const isToday = isCurrentMonth && d === today;
                  return (
                    <View key={ci} style={s.calCell}>
                      <View
                        style={[
                          s.dayCircle,
                          isActive && s.dayActive,
                          isToday && !isActive && s.dayToday,
                        ]}
                      >
                        <Text
                          style={[
                            s.dayText,
                            isActive && s.dayTextActive,
                            isToday && !isActive && s.dayTextToday,
                          ]}
                        >
                          {d}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              {/* Marcador semanal: preenchido se a semana teve atividade */}
              <View style={s.calWeekCol}>
                <View style={[s.weekDot, rowActive && s.weekDotActive]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showMedals, setShowMedals] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((r) => r.data as ProfileData),
  });

  // Contadores sociais (posts/seguidores/seguindo) via perfil público próprio.
  const { data: social } = useQuery<SocialCounts>({
    queryKey: ['profile', 'social', data?.user.id],
    queryFn: () =>
      api.get(`/users/${data!.user.id}`).then((r) => r.data as SocialCounts),
    enabled: !!data?.user.id,
  });

  const initials = data
    ? data.user.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '??';

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    setUploading(true);
    try {
      await api.post('/profile/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <View
        style={[s.root, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}
      >
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  /* ── Sub-tela medalhas ── */
  if (showMedals && data) {
    return (
      <MedalsScreen
        medals={data.medals}
        address={data.address}
        challenge={data.challenge}
        onClose={() => setShowMedals(false)}
        onEditAddress={() => {
          setShowMedals(false);
          setShowAddress(true);
        }}
      />
    );
  }

  /* ── Tela principal ── */
  return (
    <ScreenTransition>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header com gradiente */}
        <View style={[s.headerWrap, { paddingTop: insets.top + 24 }]}>
          <View style={s.headerRow}>
            <Pressable style={s.avatarWrap} onPress={pickAvatar}>
              {data?.user.avatarUrl ? (
                <Image source={{ uri: data.user.avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.avatarBadge}>
                {uploading ? (
                  <ActivityIndicator size={10} color={colors.brandInk} />
                ) : (
                  <Text style={s.avatarBadgeText}>✎</Text>
                )}
              </View>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={s.name}>{data?.user.name.toUpperCase()}</Text>
              {data?.user.city ? (
                <Text style={s.headerSub}>
                  {data.user.city}
                  {data.user.state ? `, ${data.user.state}` : ''}
                </Text>
              ) : null}
              {data?.user.assessoria ? (
                <Text style={s.headerAssessoria}>{data.user.assessoria}</Text>
              ) : null}
            </View>
          </View>

          {/* Contadores sociais estilo Instagram */}
          <View style={s.socialRow}>
            <Pressable
              style={s.socialCell}
              onPress={() => data && router.push(`/user/${data.user.id}`)}
            >
              <Text style={s.socialValue}>{social?.counts.posts ?? 0}</Text>
              <Text style={s.socialLabel}>Posts</Text>
            </Pressable>
            <Pressable
              style={s.socialCell}
              onPress={() =>
                data && router.push(`/user/${data.user.id}/connections?tab=followers`)
              }
            >
              <Text style={s.socialValue}>{social?.counts.followers ?? 0}</Text>
              <Text style={s.socialLabel}>Seguidores</Text>
            </Pressable>
            <Pressable
              style={s.socialCell}
              onPress={() =>
                data && router.push(`/user/${data.user.id}/connections?tab=following`)
              }
            >
              <Text style={s.socialValue}>{social?.counts.following ?? 0}</Text>
              <Text style={s.socialLabel}>Seguindo</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.body}>
          {/* Stats grid */}
          <Text style={s.sectionLabel}>ESTATÍSTICAS</Text>
          <View style={s.statsGrid}>
            <Pressable
              style={[s.statCell, s.statCellBorderR, s.statCellBorderB]}
              onPress={() => setShowMedals(true)}
            >
              <Text style={s.statValue}>{data?.stats?.totalMedals ?? 0}</Text>
              <Text style={s.statLabel}>Medalhas</Text>
              <Text style={s.statArrow}>↗</Text>
            </Pressable>
            <View style={[s.statCell, s.statCellBorderB]}>
              <Text style={s.statValue}>{data?.stats?.totalKm ?? 0}</Text>
              <Text style={s.statLabel}>km total</Text>
            </View>
            <View style={[s.statCell, s.statCellBorderR]}>
              <Text style={s.statValue}>{data?.stats?.monthsActive ?? 0}</Text>
              <Text style={s.statLabel}>Meses ativos</Text>
            </View>
            <View style={s.statCell}>
              <Text style={s.statValue}>
                {data?.challenge ? `${data.challenge.daysLeft}d` : '—'}
              </Text>
              <Text style={s.statLabel}>Dias restantes</Text>
            </View>
          </View>

          {/* Sequência semanal */}
          {data?.streak ? <StreakSection streak={data.streak} /> : null}

          {/* Minhas medalhas shortcut */}
          <Pressable style={[s.medalsBtn, { marginTop: 24 }]} onPress={() => setShowMedals(true)}>
            <View style={s.medalsBtnIcon}>
              <Text style={{ fontSize: 18 }}>🏅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.medalsBtnTitle}>Minhas medalhas</Text>
              <Text style={s.medalsBtnSub}>
                {data?.stats?.totalMedals ?? 0} conquistadas · ver vitrine
              </Text>
            </View>
            <Text style={{ color: colors.brand, fontSize: 16 }}>›</Text>
          </Pressable>

          {/* Plano ativo */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>PLANO ATIVO</Text>
          <View style={s.planCard}>
            <View style={s.planTop}>
              <View>
                <Text style={s.planName}>NUTRISTREET RUN</Text>
                <Text style={s.planNext}>Renovação mensal automática</Text>
              </View>
              <View style={s.pillActive}>
                <Text style={s.pillActiveText}>ATIVO</Text>
              </View>
            </View>
            <View style={s.planBottom}>
              <Text style={s.planPrice}>R$ 49,90/mês</Text>
              <Pressable style={s.benefitsBtn} onPress={() => setShowSubscribe(true)}>
                <Text style={s.benefitsBtnText}>VER BENEFÍCIOS</Text>
              </Pressable>
            </View>
          </View>

          {/* Settings */}
          <View style={[s.settingsCard, { marginTop: 24 }]}>
            <SettingRow
              label="Editar perfil"
              sub={data?.user.name}
              onPress={() => setShowEditProfile(true)}
            />
            <SettingRow
              label="Endereço de entrega"
              sub={data?.address.zipCode ? `CEP ${data.address.zipCode}` : 'Configurar'}
              onPress={() => setShowAddress(true)}
            />
            <SettingRow label="Notificações" sub="Diárias" />
            <SettingRow label="Ajuda & suporte" />
            <SettingRow label="Sair da conta" onPress={logout} last />
          </View>
        </View>

        {/* Modal editar perfil */}
        <Modal visible={showEditProfile} animationType="slide" presentationStyle="pageSheet">
          {data && (
            <EditProfileScreen
              initial={{
                name: data.user.name,
                phone: data.user.phone,
                city: data.user.city ?? data.address.deliveryCity,
                state: data.user.state ?? data.address.deliveryState,
                assessoria: data.user.assessoria,
                weightKg: data.user.weightKg,
                heightCm: data.user.heightCm,
              }}
              onClose={() => setShowEditProfile(false)}
            />
          )}
        </Modal>

        {/* Modal inscrição */}
        <Modal visible={showSubscribe} animationType="slide" presentationStyle="fullScreen">
          {data && (
            <SubscribeScreen userId={data.user.id} onClose={() => setShowSubscribe(false)} />
          )}
        </Modal>

        {/* Modal endereço */}
        <Modal visible={showAddress} animationType="slide" presentationStyle="pageSheet">
          {data && <AddressScreen initial={data.address} onClose={() => setShowAddress(false)} />}
        </Modal>
      </ScrollView>
    </ScreenTransition>
  );
}

const STAT_CELL_SIZE = '50%';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  /* Header */
  headerWrap: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 68, height: 68, borderRadius: 34 },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: font.bodyBold, fontSize: 24, color: colors.brandInk },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: { fontSize: 11, color: colors.textMute },
  name: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: colors.text,
    lineHeight: 30,
    letterSpacing: 0.5,
  },
  headerSub: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 4 },
  headerAssessoria: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brand, marginTop: 2 },

  /* Contadores sociais */
  socialRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  socialCell: { flex: 1, alignItems: 'center' },
  socialValue: { fontFamily: font.bodyBold, fontSize: 18, color: colors.text },
  socialLabel: { fontFamily: font.body, fontSize: 12, color: colors.textMute, marginTop: 2 },

  /* Body */
  body: { padding: 20, gap: 0 },
  sectionLabel: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: colors.text,
    lineHeight: 34,
    marginBottom: 20,
  },

  /* Stats grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  statCell: {
    width: STAT_CELL_SIZE,
    backgroundColor: colors.card,
    padding: 18,
    position: 'relative',
  },
  statCellBorderR: { borderRightWidth: 1, borderRightColor: colors.line },
  statCellBorderB: { borderBottomWidth: 1, borderBottomColor: colors.line },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: colors.text,
    lineHeight: 38,
  },
  statLabel: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  statArrow: { position: 'absolute', top: 12, right: 12, color: colors.brand, fontSize: 14 },

  /* Streak / calendário */
  streakCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  streakTop: {
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  streakStat: { flex: 1 },
  streakValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: colors.text,
    lineHeight: 34,
  },
  streakUnit: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.textDim,
  },
  streakStatLabel: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    marginTop: 2,
  },
  streakMonth: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.text,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  calRow: { flexDirection: 'row', alignItems: 'center' },
  calDays: { flex: 1, flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  calWeekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.3,
    paddingVertical: 3,
  },
  calWeekCol: { width: 26, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayActive: { backgroundColor: colors.brand },
  dayToday: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.brand },
  dayText: { fontFamily: font.bodyMedium, fontSize: 13, color: colors.textDim },
  dayTextActive: { color: colors.brandInk, fontFamily: font.bodyBold },
  dayTextToday: { color: colors.brand, fontFamily: font.bodyBold },
  weekDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  weekDotActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },

  /* Medalhas shortcut */
  medalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(95,184,168,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.28)',
  },
  medalsBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medalsBtnTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text },
  medalsBtnSub: { fontFamily: font.body, fontSize: 11, color: colors.textDim, marginTop: 2 },

  /* Plano */
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineHi,
    padding: 18,
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.5,
  },
  planNext: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 4 },
  pillActive: {
    backgroundColor: 'rgba(61,220,132,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillActiveText: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.success,
    letterSpacing: 0.8,
  },
  planBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  planPrice: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.brand,
    letterSpacing: 0.4,
  },
  benefitsBtn: {
    borderWidth: 1,
    borderColor: colors.lineHi,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  benefitsBtnText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.text,
    letterSpacing: 0.6,
  },

  /* Settings */
  settingsCard: { borderTopWidth: 1, borderTopColor: colors.line },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  settingLabel: { fontFamily: font.bodyMedium, fontSize: 14, color: colors.text },
  settingSub: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
});
