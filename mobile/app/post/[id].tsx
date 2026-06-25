import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTransition } from '../../src/components/ScreenTransition';
import { api } from '../../src/lib/api';
import { colors, font } from '../../src/lib/tokens';
import { CommentsSheet, type PostData, PostCard } from '../(tabs)/feed';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showComments, setShowComments] = useState(false);

  const { data, isLoading } = useQuery<PostData>({
    queryKey: ['post', id],
    queryFn: () => api.get(`/posts/${id}`).then((r) => r.data as PostData),
    enabled: !!id,
  });

  return (
    <ScreenTransition>
      <View style={s.root}>
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={s.backArrow}>←</Text>
          </Pressable>
          <Text style={s.headerTitle}>Publicação</Text>
          <View style={{ width: 32 }} />
        </View>

        {isLoading || !data ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
          >
            <PostCard item={data} onComments={() => setShowComments(true)} />
          </ScrollView>
        )}
      </View>

      <CommentsSheet
        visible={showComments}
        targetType={showComments ? 'post' : null}
        targetId={showComments ? (id ?? null) : null}
        onClose={() => setShowComments(false)}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
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
});
