import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../../src/components/Avatar';
import { ScreenTransition } from '../../../src/components/ScreenTransition';
import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

type Tab = 'followers' | 'following';

interface ConnectionUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  assessoria: string | null;
  isFollowing: boolean;
  isMe: boolean;
}

function FollowPill({ user }: { user: ConnectionUser }) {
  const [following, setFollowing] = useState(user.isFollowing);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await api.post(`/users/${user.id}/follow`);
      else await api.delete(`/users/${user.id}/follow`);
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  };

  if (user.isMe) return null;
  return (
    <Pressable
      style={({ pressed }) => [
        s.pill,
        following && s.pillFollowing,
        pressed && { opacity: 0.8 },
      ]}
      onPress={toggle}
    >
      <Text style={[s.pillText, following && s.pillTextFollowing]}>
        {following ? 'Seguindo' : 'Seguir'}
      </Text>
    </Pressable>
  );
}

export default function ConnectionsScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [active, setActive] = useState<Tab>(tab === 'following' ? 'following' : 'followers');
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/users/${id}/${active}`);
      setUsers(data as ConnectionUser[]);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [id, active]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenTransition>
      <View style={[s.root, { paddingTop: insets.top + 8 }]}>
        <View style={s.topBar}>
          <Pressable
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={s.backArrow}>←</Text>
          </Pressable>
          <Text style={s.headerTitle}>Conexões</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={s.tabs}>
          {(['followers', 'following'] as Tab[]).map((t) => (
            <Pressable key={t} style={s.tab} onPress={() => setActive(t)}>
              <Text style={[s.tabText, active === t && s.tabTextActive]}>
                {t === 'followers' ? 'Seguidores' : 'Seguindo'}
              </Text>
              <View style={[s.tabUnderline, active === t && s.tabUnderlineActive]} />
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 40 }}
            ListEmptyComponent={
              <Text style={s.empty}>
                {active === 'followers' ? 'Nenhum seguidor ainda' : 'Não segue ninguém ainda'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable style={s.row} onPress={() => router.push(`/user/${item.id}`)}>
                <Avatar name={item.name} avatarUrl={item.avatarUrl} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{item.name}</Text>
                  {item.assessoria ? (
                    <Text style={s.rowSub}>{item.assessoria}</Text>
                  ) : null}
                </View>
                <FollowPill user={item} />
              </Pressable>
            )}
          />
        )}
      </View>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { fontSize: 26, color: colors.text, lineHeight: 28 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: font.bodyBold, fontSize: 16, color: colors.text },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingTop: 12, gap: 8 },
  tabText: { fontFamily: font.bodyMedium, fontSize: 14, color: colors.textMute },
  tabTextActive: { color: colors.text, fontFamily: font.bodyBold },
  tabUnderline: { height: 2, width: '60%', backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: colors.brand },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowName: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },
  rowSub: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 1 },

  pill: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillFollowing: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.lineHi },
  pillText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brandInk },
  pillTextFollowing: { color: colors.text },

  empty: { textAlign: 'center', marginTop: 40, fontFamily: font.body, fontSize: 14, color: colors.textMute },
});
