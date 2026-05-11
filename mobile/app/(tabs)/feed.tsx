import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTransition } from '../../src/components/ScreenTransition';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type Reaction = { type: string; count: number; myReaction: boolean };

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
  startedAt: string;
  reactions: Reaction[];
  commentsCount: number;
};

type PostData = {
  id: string;
  user: FeedUser;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  reactions: Reaction[];
  commentsCount: number;
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

// ─── ReactionBar ──────────────────────────────────────────────────────────────

function ReactionBar({
  targetType,
  targetId,
  reactions: initialReactions,
  commentsCount,
  onComments,
}: {
  targetType: 'activity' | 'post';
  targetId: string;
  reactions: Reaction[];
  commentsCount: number;
  onComments: () => void;
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pending, setPending] = useState(false);

  const toggle = async (type: string) => {
    if (pending) return;
    setPending(true);

    // Optimistic update
    setReactions((prev) =>
      prev.map((r) => {
        if (r.type === type) {
          return {
            ...r,
            count: r.myReaction ? r.count - 1 : r.count + 1,
            myReaction: !r.myReaction,
          };
        }
        // Remove other active reaction
        if (r.myReaction) return { ...r, count: r.count - 1, myReaction: false };
        return r;
      }),
    );

    try {
      await api.post('/reactions', { targetType, targetId, type });
    } catch {
      setReactions(initialReactions);
    } finally {
      setPending(false);
    }
  };

  const fire = reactions.find((r) => r.type === 'fire')!;
  const clap = reactions.find((r) => r.type === 'clap')!;

  return (
    <View style={s.reactionBar}>
      <Pressable style={s.reactionBtn} onPress={() => toggle('fire')}>
        <Text style={s.reactionEmoji}>🔥</Text>
        <Text style={[s.reactionCount, fire.myReaction && s.reactionActive]}>
          {fire.count > 0 ? fire.count : ''}
        </Text>
      </Pressable>

      <Pressable style={s.reactionBtn} onPress={() => toggle('clap')}>
        <Text style={s.reactionEmoji}>👏</Text>
        <Text style={[s.reactionCount, clap.myReaction && s.reactionActive]}>
          {clap.count > 0 ? clap.count : ''}
        </Text>
      </Pressable>

      <View style={s.reactionDivider} />

      <Pressable style={s.reactionBtn} onPress={onComments}>
        <Text style={s.reactionEmoji}>💬</Text>
        <Text style={s.reactionCount}>{commentsCount > 0 ? commentsCount : ''}</Text>
      </Pressable>
    </View>
  );
}

// ─── UserHeader ───────────────────────────────────────────────────────────────

function UserHeader({ user, time }: { user: FeedUser; time: string }) {
  return (
    <View style={s.cardUserRow}>
      <Avatar user={user} size={36} />
      <View style={s.cardUserInfo}>
        <Text style={s.cardUserName}>{user.name}</Text>
        <Text style={s.cardUserMeta}>
          {user.assessoria ? `${user.assessoria} · ` : ''}
          {time}
        </Text>
      </View>
    </View>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

function ActivityCard({
  item,
  onComments,
}: {
  item: ActivityData;
  onComments: (type: 'activity' | 'post', id: string) => void;
}) {
  return (
    <View style={s.card}>
      <UserHeader user={item.user} time={timeAgo(item.startedAt)} />

      <View style={s.activityBody}>
        <View style={s.activityIconWrap}>
          <Text style={s.activityIcon}>🏃</Text>
        </View>
        <View style={s.activityInfo}>
          <Text style={s.activityTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={s.activityStats}>
            <Text style={s.activityKm}>
              {item.distanceKm.toFixed(1)}
              <Text style={s.activityUnit}> km</Text>
            </Text>
            {item.pace ? (
              <>
                <Text style={s.activityDot}>·</Text>
                <Text style={s.activityPace}>{item.pace}/km</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <ReactionBar
        targetType="activity"
        targetId={item.id}
        reactions={item.reactions}
        commentsCount={item.commentsCount}
        onComments={() => onComments('activity', item.id)}
      />
    </View>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  item,
  onComments,
}: {
  item: PostData;
  onComments: (type: 'activity' | 'post', id: string) => void;
}) {
  return (
    <View style={s.card}>
      <UserHeader user={item.user} time={timeAgo(item.createdAt)} />

      <Text style={s.postBody}>{item.body}</Text>

      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={s.postImage} resizeMode="cover" />
      ) : null}

      <ReactionBar
        targetType="post"
        targetId={item.id}
        reactions={item.reactions}
        commentsCount={item.commentsCount}
        onComments={() => onComments('post', item.id)}
      />
    </View>
  );
}

// ─── CommentsSheet ────────────────────────────────────────────────────────────

function CommentsSheet({
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      setBody('');
      setImage(null);
      onPosted();
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[np.root, { backgroundColor: colors.card }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={np.handle}>
          <View style={np.handleBar} />
        </View>

        <View style={np.titleRow}>
          <Text style={np.title}>Novo post</Text>
          <Pressable onPress={onClose}>
            <Text style={np.close}>✕</Text>
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
              <Pressable style={np.imageRemove} onPress={() => setImage(null)}>
                <Text style={np.imageRemoveText}>✕</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={[np.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={np.photoBtn} onPress={pickImage}>
            <Text style={np.photoBtnText}>📷 Foto</Text>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FeedScreen ───────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

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
          <Text style={s.kicker}>COMUNIDADE</Text>
          <Text style={s.title}>FEED</Text>
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

        {/* FAB */}
        <Pressable
          style={[s.fab, { bottom: insets.bottom + 72 }]}
          onPress={() => setShowNewPost(true)}
        >
          <Text style={s.fabText}>+</Text>
        </Pressable>
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
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
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },

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
    padding: 14,
    gap: 10,
  },
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

  // Post card
  postBody: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },

  // Reaction bar
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reactionEmoji: { fontSize: 15 },
  reactionCount: {
    fontFamily: font.bodyMedium,
    fontSize: 12,
    color: colors.textMute,
    minWidth: 12,
  },
  reactionActive: { color: colors.brand },
  reactionDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.line,
    marginHorizontal: 4,
  },

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

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontFamily: font.body,
    fontSize: 28,
    color: colors.brandInk,
    lineHeight: 32,
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
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.5,
  },
  close: { fontFamily: font.body, fontSize: 16, color: colors.textMute, padding: 4 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  input: {
    fontFamily: font.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreviewWrap: { position: 'relative' },
  imagePreview: { width: '100%', height: 180, borderRadius: 12 },
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
  imageRemoveText: { fontFamily: font.bodyBold, fontSize: 12, color: '#fff' },
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  photoBtnText: { fontFamily: font.bodyMedium, fontSize: 13, color: colors.textDim },
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
});
