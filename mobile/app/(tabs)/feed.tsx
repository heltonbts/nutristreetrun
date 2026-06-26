import polylineCodec from '@mapbox/polyline';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentIcon, LikeIcon, ShareIcon } from '../../src/components/ReactionIcons';
import { ScreenTransition } from '../../src/components/ScreenTransition';
import { BellIcon, CameraIcon, CloseIcon, PlusIcon } from '../../src/components/UiIcons';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type TopComment = {
  id: string;
  body: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type FeedUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  assessoria: string | null;
};

type ActivityData = {
  id: string;
  user: FeedUser;
  title: string;
  distanceKm: number;
  pace: string | null;
  durationSec: number | null;
  routePolyline: string | null;
  startedAt: string;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  topComments: TopComment[];
};

export type PostData = {
  id: string;
  user: FeedUser;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  topComments: TopComment[];
};

type FeedItem =
  | { type: 'activity'; score: number; data: ActivityData }
  | { type: 'post'; score: number; data: PostData };

type FeedResponse = { items: FeedItem[]; page: number; hasMore: boolean };

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

type LatLng = { latitude: number; longitude: number };

// Decodifica o polyline (Google) e calcula a região que enquadra o traçado.
function decodeRoute(encoded: string): { coords: LatLng[]; region: Region | null } {
  let pairs: [number, number][] = [];
  try {
    pairs = polylineCodec.decode(encoded);
  } catch {
    return { coords: [], region: null };
  }
  if (pairs.length < 2) return { coords: [], region: null };
  const coords = pairs.map(([latitude, longitude]) => ({ latitude, longitude }));
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLng = coords[0].longitude;
  let maxLng = coords[0].longitude;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }
  const region: Region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.005),
  };
  return { coords, region };
}

function initials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 36 }: { user: FeedUser; size?: number }) {
  const radius = size / 2;
  if (user.avatarUrl) {
    return (
      <Image
        source={{ uri: user.avatarUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <View style={[s.avatarFallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[s.avatarInitials, { fontSize: size * 0.34 }]}>{initials(user.name)}</Text>
    </View>
  );
}

// ─── useLike ────────────────────────────────────────────────────────────────
// Estado da curtida (coração único). Update otimista + servidor como fonte da
// verdade. `forceLike` é usado pelo double-tap (só curte, nunca descurte).

function useLike(
  targetType: 'activity' | 'post',
  targetId: string,
  initialLiked: boolean,
  initialCount: number,
) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const pending = useRef(false);

  const toggle = useCallback(
    async (forceLike = false) => {
      if (pending.current) return;
      if (forceLike && liked) return; // double-tap em algo já curtido = no-op
      pending.current = true;

      const prevLiked = liked;
      const prevCount = count;
      const nextLiked = forceLike ? true : !liked;
      setLiked(nextLiked);
      setCount((c) => c + (nextLiked ? 1 : -1));

      try {
        const { data } = await api.post('/likes', { targetType, targetId });
        setLiked(data.liked);
        setCount(data.count);
      } catch {
        setLiked(prevLiked);
        setCount(prevCount);
      } finally {
        pending.current = false;
      }
    },
    [liked, count, targetType, targetId],
  );

  return { liked, count, toggle };
}

// ─── LikeBar ──────────────────────────────────────────────────────────────────

function LikeBar({
  liked,
  onLike,
  commentsCount,
  onComments,
  onShare,
}: {
  liked: boolean;
  onLike: () => void;
  commentsCount: number;
  onComments: () => void;
  onShare: () => void;
}) {
  return (
    <View style={s.likeBar}>
      <Pressable
        style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}
        onPress={onLike}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Descurtir' : 'Curtir'}
      >
        <LikeIcon active={liked} size={26} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}
        onPress={onComments}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Comentar"
      >
        <CommentIcon size={24} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}
        onPress={onShare}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Compartilhar"
      >
        <ShareIcon size={24} />
      </Pressable>
    </View>
  );
}

// ─── LikesCount + CommentsPreview ──────────────────────────────────────────────

function LikesCount({ count }: { count: number }) {
  if (count <= 0) return <Text style={s.likesCount}>Seja o primeiro a curtir</Text>;
  return (
    <Text style={s.likesCount}>
      {count.toLocaleString('pt-BR')} curtida{count === 1 ? '' : 's'}
    </Text>
  );
}

function CommentsPreview({
  commentsCount,
  topComments,
  onComments,
}: {
  commentsCount: number;
  topComments: TopComment[];
  onComments: () => void;
}) {
  if (commentsCount === 0) return null;
  return (
    <View style={s.commentsPreview}>
      {commentsCount > topComments.length ? (
        <Pressable onPress={onComments} hitSlop={4}>
          <Text style={s.viewAllComments}>
            Ver todos os {commentsCount.toLocaleString('pt-BR')} comentários
          </Text>
        </Pressable>
      ) : null}
      {topComments.map((c) => (
        <Text key={c.id} style={s.previewComment} numberOfLines={2}>
          <Text style={s.previewCommentName}>{c.user.name}</Text> {c.body}
        </Text>
      ))}
    </View>
  );
}

// ─── UserHeader ───────────────────────────────────────────────────────────────

function UserHeader({ user, time }: { user: FeedUser; time: string }) {
  const router = useRouter();
  const goToProfile = () => router.push(`/user/${user.id}`);
  return (
    <Pressable style={s.cardUserRow} onPress={goToProfile} hitSlop={4}>
      <Avatar user={user} size={38} />
      <View style={s.cardUserInfo}>
        <Text style={s.cardUserName}>{user.name}</Text>
        <Text style={s.cardUserMeta}>
          {user.assessoria ? `${user.assessoria} · ` : ''}
          {time}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Share helper ─────────────────────────────────────────────────────────────

async function shareFeedItem(user: FeedUser, text: string) {
  try {
    await Share.share({
      message: `${user.name} no NutriStreet Run:\n\n${text}`,
    });
  } catch {
    // usuário cancelou o sheet — sem ação
  }
}

// ─── LikeableMedia ────────────────────────────────────────────────────────────
// Envolve a mídia pra dar double-tap → curtir (com coração animado), igual Insta.

function LikeableMedia({
  onDoubleLike,
  children,
}: {
  onDoubleLike: () => void;
  children: ReactNode;
}) {
  const lastTap = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;

  const popHeart = () => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        delay: 450,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      onDoubleLike();
      popHeart();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <Pressable onPress={onPress}>
      {children}
      <Animated.View
        style={[s.heartOverlay, { opacity: heartScale, transform: [{ scale: heartScale }] }]}
        pointerEvents="none"
      >
        <LikeIcon active size={96} />
      </Animated.View>
    </Pressable>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

function ActivityStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.actStat}>
      <Text style={s.actStatValue}>{value}</Text>
      <Text style={s.actStatLabel}>{label}</Text>
    </View>
  );
}

function ActivityCard({
  item,
  onComments,
}: {
  item: ActivityData;
  onComments: (type: 'activity' | 'post', id: string) => void;
}) {
  const route = useMemo(
    () => (item.routePolyline ? decodeRoute(item.routePolyline) : { coords: [], region: null }),
    [item.routePolyline],
  );
  const { liked, count, toggle } = useLike(
    'activity',
    item.id,
    item.likedByMe,
    item.likesCount,
  );

  return (
    <View style={s.card}>
      <UserHeader user={item.user} time={timeAgo(item.startedAt)} />

      <View style={s.actHead}>
        <Text style={s.actKicker}>CORRIDA</Text>
        <Text style={s.actName} numberOfLines={1}>
          {item.title}
        </Text>
      </View>

      <View style={s.actStatsRow}>
        <ActivityStat value={`${item.distanceKm.toFixed(2)}`} label="km" />
        <View style={s.actStatDivider} />
        <ActivityStat
          value={item.durationSec != null ? fmtDuration(item.durationSec) : '—'}
          label="Tempo"
        />
        <View style={s.actStatDivider} />
        <ActivityStat value={item.pace ?? '—'} label="Pace /km" />
      </View>

      {route.region && route.coords.length > 1 ? (
        <LikeableMedia onDoubleLike={() => toggle(true)}>
          <View style={s.actMapWrap} pointerEvents="none">
            <MapView
              style={s.actMap}
              region={route.region}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              loadingEnabled
              loadingBackgroundColor={colors.card}
            >
              <Polyline coordinates={route.coords} strokeColor={colors.brand} strokeWidth={4} />
            </MapView>
          </View>
        </LikeableMedia>
      ) : null}

      <LikeBar
        liked={liked}
        onLike={() => toggle()}
        commentsCount={item.commentsCount}
        onComments={() => onComments('activity', item.id)}
        onShare={() =>
          shareFeedItem(
            item.user,
            `Correu ${item.distanceKm.toFixed(2)} km — ${item.title}`,
          )
        }
      />
      <LikesCount count={count} />
      <CommentsPreview
        commentsCount={item.commentsCount}
        topComments={item.topComments}
        onComments={() => onComments('activity', item.id)}
      />
    </View>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

export function PostCard({
  item,
  onComments,
}: {
  item: PostData;
  onComments: (type: 'activity' | 'post', id: string) => void;
}) {
  const { liked, count, toggle } = useLike(
    'post',
    item.id,
    item.likedByMe,
    item.likesCount,
  );

  return (
    <View style={s.cardFlush}>
      <View style={[s.cardPad, s.postHeaderPad]}>
        <UserHeader user={item.user} time={timeAgo(item.createdAt)} />
      </View>

      {item.imageUrl ? (
        <LikeableMedia onDoubleLike={() => toggle(true)}>
          <Image source={{ uri: item.imageUrl }} style={s.postImage} resizeMode="cover" />
        </LikeableMedia>
      ) : null}

      <View style={s.cardPad}>
        <LikeBar
          liked={liked}
          onLike={() => toggle()}
          commentsCount={item.commentsCount}
          onComments={() => onComments('post', item.id)}
          onShare={() => shareFeedItem(item.user, item.body)}
        />
        <LikesCount count={count} />
        {item.body ? (
          <Text style={s.caption}>
            <Text style={s.captionName}>{item.user.name}</Text> {item.body}
          </Text>
        ) : null}
        <CommentsPreview
          commentsCount={item.commentsCount}
          topComments={item.topComments}
          onComments={() => onComments('post', item.id)}
        />
      </View>
    </View>
  );
}

// ─── CommentsSheet ────────────────────────────────────────────────────────────

export function CommentsSheet({
  visible,
  targetType,
  targetId,
  onClose,
}: {
  visible: boolean;
  targetType: 'activity' | 'post' | null;
  targetId: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKbHeight(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const load = useCallback(async () => {
    if (!targetType || !targetId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/comments/${targetType}/${targetId}`);
      setComments(data as Comment[]);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  const send = async () => {
    if (!body.trim() || !targetType || !targetId || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/comments', {
        targetType,
        targetId,
        body: body.trim(),
      });
      setComments((prev) => [...prev, data as Comment]);
      setBody('');
    } finally {
      setSending(false);
    }
  };

  const dismiss = () => {
    setComments([]);
    setBody('');
    setKbHeight(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={load}
      onRequestClose={dismiss}
    >
      <View style={[cs.root, { backgroundColor: colors.card, paddingBottom: kbHeight }]}>
        {/* Handle bar */}
        <View style={cs.handle}>
          <View style={cs.handleBar} />
        </View>

        <View style={cs.titleRow}>
          <Text style={cs.title}>Comentários</Text>
          <Pressable onPress={dismiss}>
            <Text style={cs.close}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={cs.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={cs.list}
            ListEmptyComponent={
              <Text style={cs.empty}>Nenhum comentário ainda. Seja o primeiro!</Text>
            }
            renderItem={({ item }) => (
              <View style={cs.commentRow}>
                <Avatar user={{ ...item.user, assessoria: null }} size={30} />
                <View style={cs.commentBubble}>
                  <Text style={cs.commentName}>{item.user.name}</Text>
                  <Text style={cs.commentBody}>{item.body}</Text>
                  <Text style={cs.commentTime}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={[cs.inputRow, { paddingBottom: kbHeight > 0 ? 8 : insets.bottom + 8 }]}>
          <TextInput
            style={cs.input}
            placeholder="Escreva um comentário..."
            placeholderTextColor={colors.textMute}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <Pressable
            style={[cs.sendBtn, (!body.trim() || sending) && cs.sendBtnDisabled]}
            onPress={send}
            disabled={!body.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.brandInk} />
            ) : (
              <Text style={cs.sendText}>↑</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── NewPostSheet ─────────────────────────────────────────────────────────────

function NewPostSheet({
  visible,
  onClose,
  onPosted,
}: {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setBody('');
    setImage(null);
    setSuccess(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5], // retrato estilo Instagram
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const submit = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('body', body.trim());
      if (image) {
        formData.append('image', {
          uri: image.uri,
          name: 'photo.jpg',
          type: 'image/jpeg',
        } as any);
      }
      await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Atualiza o feed em background; mostra a confirmação aqui dentro
      // do sheet (success view inline). Texto e foto só são limpos depois
      // que o usuário fecha — pra preservar caso o backend tenha falhado.
      onPosted();
      setSuccess(true);
    } catch {
      Alert.alert(
        'Não foi possível publicar',
        'Verifique a conexão e tente novamente. Seu texto está salvo.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (success) reset();
        onClose();
      }}
    >
      <KeyboardAvoidingView
        style={[np.root, { backgroundColor: colors.card }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={np.handle}>
          <View style={np.handleBar} />
        </View>

        {success ? (
          // Confirmação de sucesso inline (mesma família do modal do post-run)
          <View style={np.successWrap}>
            <View style={np.successIcon}>
              <Text style={np.successIconText}>✓</Text>
            </View>
            <Text style={np.successTitle}>POST PUBLICADO!</Text>
            <Text style={np.successSub}>Sua publicação já está no feed.</Text>

            <Pressable
              style={({ pressed }) => [np.successBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={np.successBtnText}>VER NO FEED</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={np.titleRow}>
              <Text style={np.title}>NOVO POST</Text>
              <Pressable onPress={onClose} hitSlop={10} style={np.closeBtn}>
                <CloseIcon size={20} color={colors.textMute} />
              </Pressable>
            </View>

            <View style={np.body}>
              <TextInput
                style={np.input}
                placeholder="Conta o que tá rolando..."
                placeholderTextColor={colors.textMute}
                value={body}
                onChangeText={setBody}
                multiline
                autoFocus
                maxLength={500}
              />

              {image ? (
                <View style={np.imagePreviewWrap}>
                  <Image source={{ uri: image.uri }} style={np.imagePreview} resizeMode="cover" />
                  <Pressable style={np.imageRemove} onPress={() => setImage(null)} hitSlop={6}>
                    <CloseIcon size={14} color="#fff" strokeWidth={2.4} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={[np.footer, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable
                style={({ pressed }) => [np.photoBtn, pressed && { opacity: 0.7 }]}
                onPress={pickImage}
              >
                <CameraIcon size={18} color={colors.textDim} />
                <Text style={np.photoBtnText}>{image ? 'TROCAR FOTO' : 'ADICIONAR FOTO'}</Text>
              </Pressable>
              <Text style={np.charCount}>{body.length}/500</Text>
              <Pressable
                style={[np.submitBtn, (!body.trim() || sending) && np.submitBtnDisabled]}
                onPress={submit}
                disabled={!body.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.brandInk} />
                ) : (
                  <Text style={np.submitText}>PUBLICAR</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FeedScreen ───────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: unreadCount = 0, refetch: refetchUnread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () =>
      api.get('/notifications/unread-count').then((r) => r.data.count as number),
    refetchInterval: 30000,
  });

  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [commentsTarget, setCommentsTarget] = useState<{
    type: 'activity' | 'post';
    id: string;
  } | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);

  const loadPage = useCallback(async (pageNum: number, replace = false) => {
    try {
      const { data } = await api.get<FeedResponse>(`/feed?page=${pageNum}`);
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setPage(pageNum);
      setHasMore(data.hasMore);
    } catch {
      // keep current state on error
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await loadPage(1, true);
    setLoading(false);
  }, [loadPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(1, true);
    setRefreshing(false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPage(page + 1);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, loadPage]);

  // Initial load
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    initialLoad();
  }

  // Refresh feed silently when the tab gains focus (e.g. after saving a run)
  useFocusEffect(
    useCallback(() => {
      if (initialized.current) void loadPage(1, true);
      void refetchUnread();
    }, [loadPage, refetchUnread]),
  );

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === 'activity') {
      return (
        <ActivityCard item={item.data} onComments={(type, id) => setCommentsTarget({ type, id })} />
      );
    }
    return <PostCard item={item.data} onComments={(type, id) => setCommentsTarget({ type, id })} />;
  }, []);

  return (
    <ScreenTransition>
      <View style={[s.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>COMUNIDADE</Text>
            <Text style={s.title}>FEED</Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.headerAction, pressed && { opacity: 0.6 }]}
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notificações"
          >
            <BellIcon size={21} color={colors.text} />
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.headerAction, pressed && { opacity: 0.6 }]}
            onPress={() => setShowNewPost(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Criar post"
          >
            <PlusIcon size={22} color={colors.brand} strokeWidth={2.4} />
          </Pressable>
        </View>

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.brand} size="large" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.type}-${item.data.id}`}
            renderItem={renderItem}
            contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 96 }]}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.brand}
              />
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>👥</Text>
                <Text style={s.emptyTitle}>Nenhuma publicação ainda</Text>
                <Text style={s.emptyDesc}>Seja o primeiro da sua assessoria a postar!</Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={s.loadingMore}>
                  <ActivityIndicator color={colors.brand} />
                </View>
              ) : null
            }
          />
        )}
      </View>

      <CommentsSheet
        visible={!!commentsTarget}
        targetType={commentsTarget?.type ?? null}
        targetId={commentsTarget?.id ?? null}
        onClose={() => setCommentsTarget(null)}
      />

      <NewPostSheet
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onPosted={refresh}
      />
    </ScreenTransition>
  );
}

// ─── Styles — FeedScreen ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(95,184,168,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.32)',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: '#fff',
    lineHeight: 13,
  },
  kicker: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 2,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 44,
    color: colors.text,
    lineHeight: 46,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingMore: { paddingVertical: 20, alignItems: 'center' },
  list: { paddingHorizontal: 14, gap: 14, paddingTop: 4 },

  // Avatar fallback
  avatarFallback: {
    backgroundColor: 'rgba(95,184,168,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: font.bodyBold,
    color: colors.brand,
  },

  // Card shared
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 16,
  },
  actHead: { gap: 4 },
  actKicker: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 2.2,
  },
  actName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 38,
    color: colors.text,
    lineHeight: 40,
    letterSpacing: 0.6,
  },
  actStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  actStat: { flex: 1, alignItems: 'flex-start' },
  actStatDivider: {
    width: 1,
    height: 38,
    backgroundColor: colors.line,
    marginHorizontal: 12,
  },
  actStatValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 34,
    color: colors.text,
    lineHeight: 36,
    letterSpacing: 0.4,
  },
  actStatLabel: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  // Mapa full-bleed lateral: estende -18 (= card padding) pra dar a
  // sensação adidas-like. Não puxa pra baixo porque a ReactionBar
  // vem depois e precisa do seu próprio espaço.
  actMapWrap: {
    height: 240,
    marginHorizontal: -18,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  actMap: { flex: 1 },
  cardUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardUserInfo: { flex: 1 },
  cardUserName: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  cardUserMeta: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    marginTop: 1,
  },

  // Activity card
  activityBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(95,184,168,0.06)',
    borderRadius: 10,
    padding: 10,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(95,184,168,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: { fontSize: 18 },
  activityInfo: { flex: 1 },
  activityTitle: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  activityStats: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  activityKm: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.text,
    lineHeight: 22,
    letterSpacing: 0.4,
  },
  activityUnit: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
  },
  activityDot: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
  },
  activityPace: {
    fontFamily: font.bodyMedium,
    fontSize: 12,
    color: colors.textDim,
  },

  // Post card (full-bleed: mídia encosta nas laterais; texto tem padding próprio)
  cardFlush: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  cardPad: { paddingHorizontal: 16, gap: 8, paddingTop: 6 },
  // Respiro entre o cabeçalho (nome) e a foto — sem isso a imagem cola no nome.
  postHeaderPad: { paddingTop: 10, paddingBottom: 12 },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 5, // retrato estilo Instagram
    backgroundColor: colors.bg,
  },

  // Coração animado do double-tap
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Like bar (coração / comentar / compartilhar)
  likeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  iconBtn: { paddingVertical: 2 },

  likesCount: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.text,
  },

  // Caption (nome + corpo do post)
  caption: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  captionName: { fontFamily: font.bodyBold },

  // Prévia de comentários
  commentsPreview: { gap: 3 },
  viewAllComments: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textMute,
  },
  previewComment: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textDim,
    lineHeight: 19,
  },
  previewCommentName: { fontFamily: font.bodyBold, color: colors.text },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// ─── Styles — CommentsSheet ───────────────────────────────────────────────────

const cs = StyleSheet.create({
  root: { flex: 1 },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.5,
  },
  close: { fontFamily: font.body, fontSize: 16, color: colors.textMute, padding: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 14 },
  empty: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textMute,
    textAlign: 'center',
    marginTop: 40,
  },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentBubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  commentName: { fontFamily: font.bodyBold, fontSize: 12, color: colors.text },
  commentBody: { fontFamily: font.body, fontSize: 13, color: colors.textDim, lineHeight: 19 },
  commentTime: { fontFamily: font.body, fontSize: 10, color: colors.textMute, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: font.body,
    fontSize: 13,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendText: {
    fontFamily: font.bodyBold,
    fontSize: 18,
    color: colors.brandInk,
    lineHeight: 20,
  },
});

// ─── Styles — NewPostSheet ────────────────────────────────────────────────────

const np = StyleSheet.create({
  root: { flex: 1 },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.text,
    letterSpacing: 1.2,
    lineHeight: 28,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  input: {
    fontFamily: font.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreviewWrap: { position: 'relative', alignSelf: 'center', width: '70%' },
  imagePreview: { width: '100%', aspectRatio: 4 / 5, borderRadius: 12 },
  imageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  photoBtnText: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 0.6,
  },
  charCount: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    textAlign: 'right',
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.brand,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.brandInk,
    letterSpacing: 1,
  },
  // Success view (inline, depois de publicar com sucesso)
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(95,184,168,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successIconText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 34,
    color: colors.brand,
    lineHeight: 36,
  },
  successTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: colors.text,
    letterSpacing: 1.4,
    lineHeight: 34,
  },
  successSub: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.textMute,
    marginTop: 6,
    marginBottom: 28,
    textAlign: 'center',
  },
  successBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  successBtnText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.brandInk,
    letterSpacing: 1.5,
  },
});
