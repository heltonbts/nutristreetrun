import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentIcon, LikeIcon } from '../src/components/ReactionIcons';
import { BellIcon, RunnerGlyph } from '../src/components/UiIcons';
import { api } from '../src/lib/api';
import { colors, font } from '../src/lib/tokens';

type NotifType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'RANK_PASSED';

interface Actor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  targetType: string | null;
  targetId: string | null;
  actor: Actor | null;
}

const AVATAR_COLORS = ['#5FB8A8', '#7B9FD4', '#C4845A', '#9B7FD4', '#5A9BC4', '#D4A05A'];

function initials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(seed: string) {
  const code = seed.charCodeAt(0) + (seed.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function TypeBadge({ type }: { type: NotifType }) {
  const map: Record<NotifType, { bg: string; node: React.ReactNode }> = {
    LIKE: { bg: '#E5484D', node: <LikeIcon size={12} inactiveColor="#fff" /> },
    COMMENT: { bg: colors.brand, node: <CommentIcon size={12} inactiveColor="#fff" /> },
    FOLLOW: { bg: '#7B9FD4', node: <Text style={s.badgeGlyph}>+</Text> },
    RANK_PASSED: { bg: '#C4845A', node: <RunnerGlyph size={12} color="#fff" strokeWidth={2} /> },
  };
  const { bg, node } = map[type];
  return <View style={[s.badge, { backgroundColor: bg }]}>{node}</View>;
}

function NotifAvatar({ actor, type }: { actor: Actor | null; type: NotifType }) {
  return (
    <View style={s.avatarWrap}>
      {actor?.avatarUrl ? (
        <Image source={{ uri: actor.avatarUrl }} style={s.avatar} />
      ) : actor ? (
        <View style={[s.avatar, { backgroundColor: avatarColor(actor.name) }]}>
          <Text style={s.avatarText}>{initials(actor.name)}</Text>
        </View>
      ) : (
        <View style={[s.avatar, { backgroundColor: colors.card }]}>
          <BellIcon size={18} color={colors.textMute} />
        </View>
      )}
      <TypeBadge type={type} />
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  // Marca todas como lidas ao abrir e atualiza o contador no header do Feed.
  useEffect(() => {
    void load();
    void (async () => {
      try {
        await api.patch('/notifications/read-all');
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      } catch {
        // não bloqueia a tela se falhar
      }
    })();
  }, [load, queryClient]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get('/notifications', { params: { cursor } });
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const openNotif = useCallback(
    (n: Notif) => {
      if (n.type === 'FOLLOW' && n.actor) {
        router.push(`/user/${n.actor.id}`);
      } else if (n.type === 'RANK_PASSED') {
        router.push('/(tabs)/ranking');
      } else if (n.targetType === 'post' && n.targetId) {
        router.push(`/post/${n.targetId}`);
      } else if (n.targetType === 'activity' && n.targetId) {
        router.push(`/runs/${n.targetId}`);
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Notif }) => (
      <Pressable
        style={({ pressed }) => [s.row, !item.read && s.rowUnread, pressed && s.rowPressed]}
        onPress={() => openNotif(item)}
      >
        <NotifAvatar actor={item.actor} type={item.type} />
        <View style={s.rowBody}>
          <Text style={s.rowText} numberOfLines={3}>
            <Text style={s.rowTitle}>{item.title}</Text>
            {'  '}
            {item.body}
          </Text>
          <Text style={s.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={s.unreadDot} />}
      </Pressable>
    ),
    [openNotif],
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>ATIVIDADE</Text>
          <Text style={s.title}>NOTIFICAÇÕES</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <BellIcon size={40} color={colors.textMute} />
          <Text style={s.emptyTitle}>Tudo quieto por aqui</Text>
          <Text style={s.emptyText}>
            Curtidas, comentários, novos seguidores e mudanças no ranking vão aparecer aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: colors.text, fontSize: 26, lineHeight: 30 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2 },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    color: colors.text,
    lineHeight: 32,
    letterSpacing: 0.5,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  emptyText: { fontFamily: font.body, fontSize: 13, color: colors.textMute, textAlign: 'center', lineHeight: 19 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  rowUnread: { backgroundColor: 'rgba(95,184,168,0.08)' },
  rowPressed: { opacity: 0.7 },
  rowBody: { flex: 1, minWidth: 0 },
  rowText: { fontFamily: font.body, fontSize: 13, color: colors.textDim, lineHeight: 18 },
  rowTitle: { fontFamily: font.bodyBold, color: colors.text },
  rowTime: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, flexShrink: 0 },

  avatarWrap: { width: 46, height: 46, flexShrink: 0 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font.bodyBold, color: '#fff', fontSize: 16 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeGlyph: { color: '#fff', fontFamily: font.bodyBold, fontSize: 13, lineHeight: 15 },
});
