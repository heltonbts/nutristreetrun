import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../../src/components/Avatar';
import { RouteThumbnail } from '../../../src/components/RouteThumbnail';
import { ScreenTransition } from '../../../src/components/ScreenTransition';
import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

interface PublicProfile {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    city: string | null;
    state: string | null;
    assessoria: string | null;
  };
  counts: { posts: number; followers: number; following: number };
  isFollowing: boolean;
  isMe: boolean;
  stats: { totalKm: number; totalMedals: number };
}

type GridItem = {
  type: 'post' | 'activity';
  id: string;
  imageUrl: string | null;
  body: string | null;
  routePolyline: string | null;
  distanceKm: number | null;
  title: string | null;
  date: string;
};

const GAP = 2;
const COLS = 3;

function Counter({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={s.counter} onPress={onPress} disabled={!onPress}>
      <Text style={s.counterValue}>{value.toLocaleString('pt-BR')}</Text>
      <Text style={s.counterLabel}>{label}</Text>
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cell = (Dimensions.get('window').width - GAP * (COLS - 1)) / COLS;

  const { data, isLoading } = useQuery<PublicProfile>({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data as PublicProfile),
    enabled: !!id,
  });

  const { data: grid } = useQuery<{ items: GridItem[] }>({
    queryKey: ['user', id, 'grid'],
    queryFn: () =>
      api.get(`/users/${id}/grid`).then((r) => r.data as { items: GridItem[] }),
    enabled: !!id,
  });

  // Estado local de seguir (otimista) inicializado pelo perfil.
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (data) {
      setFollowing(data.isFollowing);
      setFollowers(data.counts.followers);
    }
  }, [data]);

  const toggleFollow = async () => {
    if (!data || pending) return;
    setPending(true);
    const next = !following;
    setFollowing(next);
    setFollowers((c) => c + (next ? 1 : -1));
    try {
      const res = next
        ? await api.post(`/users/${id}/follow`)
        : await api.delete(`/users/${id}/follow`);
      setFollowing(res.data.isFollowing);
      setFollowers(res.data.followers);
    } catch {
      setFollowing(!next);
      setFollowers((c) => c + (next ? -1 : 1));
    } finally {
      setPending(false);
    }
  };

  const header = data ? (
    <View>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text style={s.backArrow}>←</Text>
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>
          {data.user.name}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.headerBody}>
        <View style={s.headerRow}>
          <Avatar name={data.user.name} avatarUrl={data.user.avatarUrl} size={84} />
          <View style={s.counters}>
            <Counter value={data.counts.posts} label="Posts" />
            <Counter
              value={followers}
              label="Seguidores"
              onPress={() => router.push(`/user/${id}/connections?tab=followers`)}
            />
            <Counter
              value={data.counts.following}
              label="Seguindo"
              onPress={() => router.push(`/user/${id}/connections?tab=following`)}
            />
          </View>
        </View>

        <Text style={s.name}>{data.user.name}</Text>
        {data.user.assessoria ? (
          <Text style={s.assessoria}>{data.user.assessoria}</Text>
        ) : null}
        {data.user.city ? (
          <Text style={s.city}>
            {data.user.city}
            {data.user.state ? `, ${data.user.state}` : ''}
          </Text>
        ) : null}

        <View style={s.statsRow}>
          <Text style={s.statsText}>
            <Text style={s.statsStrong}>{data.stats.totalKm}</Text> km totais
          </Text>
          <Text style={s.statsDot}>·</Text>
          <Text style={s.statsText}>
            <Text style={s.statsStrong}>{data.stats.totalMedals}</Text> medalhas
          </Text>
        </View>

        {data.isMe ? (
          <Pressable
            style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Text style={s.editBtnText}>Editar no perfil</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              s.followBtn,
              following && s.followingBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={toggleFollow}
          >
            <Text style={[s.followBtnText, following && s.followingBtnText]}>
              {following ? 'Seguindo' : 'Seguir'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={s.gridDivider} />
    </View>
  ) : null;

  if (isLoading || !data) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScreenTransition>
      <FlatList
        style={s.root}
        data={grid?.items ?? []}
        keyExtractor={(it) => `${it.type}-${it.id}`}
        numColumns={COLS}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, paddingBottom: insets.bottom + 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Nenhuma publicação ainda</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ width: cell, height: cell }}
            onPress={() => {
              if (item.type === 'activity') router.push(`/(tabs)/runs/${item.id}`);
              else router.push(`/post/${item.id}`);
            }}
          >
            {item.type === 'post' && item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={s.gridImg} />
            ) : item.type === 'activity' ? (
              <View style={s.gridActivity}>
                <RouteThumbnail encoded={item.routePolyline} size={cell - 16} />
                <Text style={s.gridKm}>
                  {item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : 'Corrida'}
                </Text>
              </View>
            ) : (
              <View style={s.gridText}>
                <Text style={s.gridTextBody} numberOfLines={4}>
                  {item.body}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { fontSize: 26, color: colors.text, lineHeight: 28 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.bodyBold,
    fontSize: 16,
    color: colors.text,
  },

  headerBody: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  counters: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  counter: { alignItems: 'center' },
  counterValue: { fontFamily: font.bodyBold, fontSize: 18, color: colors.text },
  counterLabel: { fontFamily: font.body, fontSize: 12, color: colors.textMute, marginTop: 1 },

  name: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.text,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  assessoria: { fontFamily: font.bodyBold, fontSize: 13, color: colors.brand },
  city: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 2 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  statsText: { fontFamily: font.body, fontSize: 13, color: colors.textDim },
  statsStrong: { fontFamily: font.bodyBold, color: colors.text },
  statsDot: { color: colors.textMute },

  followBtn: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  followBtnText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.brandInk },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.lineHi,
  },
  followingBtnText: { color: colors.text },
  editBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.lineHi,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  editBtnText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },

  gridDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: 20,
    marginBottom: GAP,
  },

  gridImg: { width: '100%', height: '100%', backgroundColor: colors.card },
  gridActivity: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridKm: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.text,
  },
  gridText: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
    padding: 8,
    justifyContent: 'center',
  },
  gridTextBody: { fontFamily: font.body, fontSize: 11, color: colors.textDim, lineHeight: 15 },

  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontFamily: font.body, fontSize: 14, color: colors.textMute },
});
