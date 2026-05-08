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

const MONTHS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

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
}

function Avatar({
  uri,
  initials,
  onPress,
  uploading,
}: {
  uri: string | null;
  initials: string;
  onPress: () => void;
  uploading: boolean;
}) {
  return (
    <Pressable style={s.avatarWrap} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={s.avatarImg} />
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
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${pct}%` }]} />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((r) => r.data as ProfileData),
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
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 20, paddingBottom: 32 + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Avatar
          uri={data?.user.avatarUrl ?? null}
          initials={initials}
          onPress={pickAvatar}
          uploading={uploading}
        />
        <View style={s.headerInfo}>
          <Text style={s.name}>{data?.user.name}</Text>
          <Text style={s.email}>{data?.user.email}</Text>
          {data?.user.city && (
            <Text style={s.location}>
              {data.user.city}
              {data.user.state ? `, ${data.user.state}` : ''}
            </Text>
          )}
          {data?.user.assessoria && (
            <Text style={s.assessoria}>{data.user.assessoria}</Text>
          )}
        </View>
      </View>

      {/* Desafio ativo */}
      {data?.challenge && (
        <View style={s.card}>
          <Text style={s.cardLabel}>DESAFIO ATIVO</Text>
          <Text style={s.cardTitle}>{data.challenge.title}</Text>
          <View style={s.challengeRow}>
            <Text style={s.challengeKm}>
              {data.challenge.doneKm}
              <Text style={s.challengeKmUnit}> / {data.challenge.goalKm} km</Text>
            </Text>
            <Text style={s.challengeDays}>{data.challenge.daysLeft}d restantes</Text>
          </View>
          <ProgressBar pct={data.challenge.pct} />
          <Text style={s.challengePct}>{data.challenge.pct}% concluído</Text>
        </View>
      )}

      {/* Strava */}
      <View style={s.card}>
        <Text style={s.cardLabel}>STRAVA</Text>
        <View style={s.stravaRow}>
          <View style={s.stravaStatus}>
            <View style={[s.statusDot, { backgroundColor: data?.strava.connected ? colors.success : colors.danger }]} />
            <Text style={s.statusText}>
              {data?.strava.connected ? 'Conectado' : 'Não conectado'}
            </Text>
          </View>
          {data?.strava.connected && (
            <Pressable style={s.syncBtn} onPress={syncStrava} disabled={syncing}>
              {syncing ? (
                <ActivityIndicator size={12} color={colors.brandInk} />
              ) : (
                <Text style={s.syncBtnText}>SINCRONIZAR</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Medalhas */}
      {data && data.medals.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardLabel}>MEDALHAS</Text>
          {data.medals.map((m) => (
            <View key={m.id} style={s.medalRow}>
              <View style={s.medalLeft}>
                <Text style={s.medalMonth}>{MONTHS[m.month - 1]} {m.year}</Text>
                <Text style={s.medalTitle}>{m.title}</Text>
              </View>
              <Text style={[s.medalStatus, { color: MEDAL_COLOR[m.status] ?? colors.textMute }]}>
                {MEDAL_LABEL[m.status] ?? m.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Sair */}
      <Pressable style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>SAIR DA CONTA</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 4 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: font.bodyBold, fontSize: 26, color: colors.brandInk },
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

  headerInfo: { flex: 1, gap: 2 },
  name: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: colors.text, lineHeight: 30 },
  email: { fontFamily: font.body, fontSize: 13, color: colors.textMute },
  location: { fontFamily: font.bodyMedium, fontSize: 12, color: colors.textDim, marginTop: 2 },
  assessoria: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  cardLabel: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.brand,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.text, lineHeight: 24 },

  challengeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  challengeKm: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: colors.text, lineHeight: 34 },
  challengeKmUnit: { fontFamily: font.bodyMedium, fontSize: 13, color: colors.textMute },
  challengeDays: { fontFamily: font.body, fontSize: 12, color: colors.textMute },
  barTrack: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.brand, borderRadius: 3 },
  challengePct: { fontFamily: font.bodyMedium, fontSize: 12, color: colors.textDim, textAlign: 'right' },

  stravaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stravaStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: font.bodyMedium, fontSize: 14, color: colors.text },
  syncBtn: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 44,
    alignItems: 'center',
  },
  syncBtnText: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brandInk, letterSpacing: 1 },

  medalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  medalLeft: { gap: 2 },
  medalMonth: { fontFamily: font.bodyBold, fontSize: 11, color: colors.textMute, letterSpacing: 1 },
  medalTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 17, color: colors.text, lineHeight: 19 },
  medalStatus: { fontFamily: font.bodyMedium, fontSize: 12 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.danger,
    letterSpacing: 1,
  },
});
