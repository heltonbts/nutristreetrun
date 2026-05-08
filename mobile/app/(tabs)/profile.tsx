import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';
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
  };
  strava: { connected: boolean; stravaId: number | null };
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
    status: string;
  }[];
  stats: { totalMedals: number; totalKm: number; monthsActive: number };
}

const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

const MEDAL_COLOR: Record<string, string> = {
  PROGRESS: colors.textMute,
  SHIPPED: colors.brand,
  DELIVERED: colors.success,
  MISSED: colors.danger,
};
const MEDAL_LABEL: Record<string, string> = {
  PROGRESS: 'Em andamento',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregue',
  MISSED: 'Não concluído',
};

function ChevronRight() {
  return (
    <Text style={{ color: colors.textMute, fontSize: 16, lineHeight: 20 }}>›</Text>
  );
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
    <Pressable
      style={[s.settingRow, !last && s.settingRowBorder]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        {sub ? <Text style={s.settingSub}>{sub}</Text> : null}
      </View>
      <ChevronRight />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showMedals, setShowMedals] = useState(false);

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((r) => r.data as ProfileData),
  });

  const initials = data
    ? data.user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
    form.append('file', { uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);

    setUploading(true);
    try {
      await api.post('/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  async function syncStrava() {
    setSyncing(true);
    try {
      const res = await api.post<{ synced: number }>('/auth/strava/sync');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('Sincronizado', `${res.data.synced} atividades importadas.`);
    } catch {
      Alert.alert('Erro', 'Falha ao sincronizar com o Strava.');
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  /* ── Sub-tela medalhas ── */
  if (showMedals) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <Pressable style={s.backBtn} onPress={() => setShowMedals(false)}>
          <Text style={s.backBtnText}>‹</Text>
        </Pressable>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 + insets.bottom }}>
          <Text style={s.sectionTitle}>MEDALHAS</Text>
          {data?.medals.length === 0 && (
            <Text style={s.emptyHint}>Nenhuma medalha ainda.</Text>
          )}
          {data?.medals.map((m) => (
            <View key={m.id} style={s.medalRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.medalMonth}>{MONTHS[m.month - 1]} {m.year}</Text>
                <Text style={s.medalTitle}>{m.title}</Text>
              </View>
              <Text style={[s.medalStatus, { color: MEDAL_COLOR[m.status] ?? colors.textMute }]}>
                {MEDAL_LABEL[m.status] ?? m.status}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* ── Tela principal ── */
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
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
              {uploading
                ? <ActivityIndicator size={10} color={colors.brandInk} />
                : <Text style={s.avatarBadgeText}>✎</Text>}
            </View>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={s.name}>{data?.user.name.toUpperCase()}</Text>
            {data?.user.city ? (
              <Text style={s.headerSub}>
                {data.user.city}{data.user.state ? `, ${data.user.state}` : ''}
              </Text>
            ) : null}
            {data?.user.assessoria ? (
              <Text style={s.headerAssessoria}>{data.user.assessoria}</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={s.body}>
        {/* Stats grid */}
        <Text style={s.sectionLabel}>ESTATÍSTICAS</Text>
        <View style={s.statsGrid}>
          <Pressable style={[s.statCell, s.statCellBorderR, s.statCellBorderB]} onPress={() => setShowMedals(true)}>
            <Text style={s.statValue}>{data?.stats.totalMedals ?? 0}</Text>
            <Text style={s.statLabel}>Medalhas</Text>
            <Text style={s.statArrow}>↗</Text>
          </Pressable>
          <View style={[s.statCell, s.statCellBorderB]}>
            <Text style={s.statValue}>{data?.stats.totalKm ?? 0}</Text>
            <Text style={s.statLabel}>km total</Text>
          </View>
          <View style={[s.statCell, s.statCellBorderR]}>
            <Text style={s.statValue}>{data?.stats.monthsActive ?? 0}</Text>
            <Text style={s.statLabel}>Meses ativos</Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statValue}>
              {data?.challenge ? `${data.challenge.daysLeft}d` : '—'}
            </Text>
            <Text style={s.statLabel}>Dias restantes</Text>
          </View>
        </View>

        {/* Minhas medalhas shortcut */}
        <Pressable style={s.medalsBtn} onPress={() => setShowMedals(true)}>
          <View style={s.medalsBtnIcon}>
            <Text style={{ fontSize: 18 }}>🏅</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.medalsBtnTitle}>Minhas medalhas</Text>
            <Text style={s.medalsBtnSub}>
              {data?.stats.totalMedals ?? 0} conquistadas · ver vitrine
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
            <Pressable style={s.benefitsBtn}>
              <Text style={s.benefitsBtnText}>VER BENEFÍCIOS</Text>
            </Pressable>
          </View>
        </View>

        {/* Settings */}
        <View style={[s.settingsCard, { marginTop: 24 }]}>
          <SettingRow
            label="Conexões"
            sub={data?.strava.connected ? 'Strava conectado' : 'Nenhuma conexão ativa'}
            onPress={syncing ? undefined : syncStrava}
          />
          <SettingRow label="Notificações" sub="Diárias" />
          <SettingRow label="Endereço de entrega" sub="Configurar" />
          <SettingRow label="Ajuda & suporte" />
          <SettingRow label="Sair da conta" onPress={logout} last />
        </View>
      </View>
    </ScrollView>
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
    backgroundImage: undefined,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 68, height: 68, borderRadius: 34 },
  avatarPlaceholder: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: font.bodyBold, fontSize: 24, color: colors.brandInk },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadgeText: { fontSize: 11, color: colors.textMute },
  name: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: colors.text, lineHeight: 30, letterSpacing: 0.5 },
  headerSub: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 4 },
  headerAssessoria: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brand, marginTop: 2 },

  /* Body */
  body: { padding: 20, gap: 0 },
  sectionLabel: {
    fontFamily: font.bodyBold, fontSize: 11, color: colors.textMute,
    letterSpacing: 1.6, marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: colors.text,
    lineHeight: 34, marginBottom: 20,
  },

  /* Stats grid */
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
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
  statValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, color: colors.text, lineHeight: 38 },
  statLabel: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  statArrow: { position: 'absolute', top: 12, right: 12, color: colors.brand, fontSize: 14 },

  /* Medalhas shortcut */
  medalsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(95,184,168,0.08)',
    borderWidth: 1, borderColor: 'rgba(95,184,168,0.28)',
  },
  medalsBtnIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  medalsBtnTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text },
  medalsBtnSub: { fontFamily: font.body, fontSize: 11, color: colors.textDim, marginTop: 2 },

  /* Plano */
  planCard: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.lineHi, padding: 18,
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.text, letterSpacing: 0.5 },
  planNext: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 4 },
  pillActive: {
    backgroundColor: 'rgba(61,220,132,0.15)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pillActiveText: { fontFamily: font.bodyBold, fontSize: 10, color: colors.success, letterSpacing: 0.8 },
  planBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line,
  },
  planPrice: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: colors.brand, letterSpacing: 0.4 },
  benefitsBtn: {
    borderWidth: 1, borderColor: colors.lineHi, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  benefitsBtnText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.text, letterSpacing: 0.6 },

  /* Settings */
  settingsCard: { borderTopWidth: 1, borderTopColor: colors.line },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  settingLabel: { fontFamily: font.bodyMedium, fontSize: 14, color: colors.text },
  settingSub: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },

  /* Medalhas sub-tela */
  backBtn: {
    margin: 16, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: colors.text, fontSize: 22, lineHeight: 28 },
  emptyHint: { fontFamily: font.body, fontSize: 14, color: colors.textMute, textAlign: 'center', marginTop: 40 },
  medalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  medalMonth: { fontFamily: font.bodyBold, fontSize: 11, color: colors.textMute, letterSpacing: 1 },
  medalTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: colors.text, lineHeight: 20, marginTop: 2 },
  medalStatus: { fontFamily: font.bodyMedium, fontSize: 12 },
});
