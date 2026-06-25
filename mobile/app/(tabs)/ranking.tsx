import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

const MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

function monthLabel() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type Scope = 'city' | 'state' | 'club';

interface RunnerItem {
  pos: number;
  name: string;
  initials: string;
  avatarUrl: string | null;
  isMe: boolean;
  km: number;
}

interface ClubItem {
  pos: number;
  name: string;
  isMe: boolean;
  runners: number;
  km: number;
}

interface RankingData {
  scope: Scope;
  label: string;
  myPos: number | null;
  items: (RunnerItem | ClubItem)[];
  hint?: string;
}

const AVATAR_COLORS = ['#5FB8A8', '#7B9FD4', '#C4845A', '#9B7FD4', '#5A9BC4', '#D4A05A'];

function avatarColor(initials: string) {
  const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function Avatar({
  initials,
  avatarUrl,
  size = 36,
}: {
  initials: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[s.avatar, dim]} />;
  }
  const bg = avatarColor(initials);
  return (
    <View style={[s.avatar, dim, { backgroundColor: bg }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

function RunnerRow({ item }: { item: RunnerItem }) {
  const me = item.isMe;
  return (
    <View style={[s.row, me ? s.rowMe : s.rowDefault]}>
      <Text
        style={[
          s.pos,
          { color: me ? colors.brandInk : item.pos <= 3 ? colors.brand : colors.textMute },
        ]}
      >
        {item.pos}
      </Text>
      <Avatar initials={item.initials} avatarUrl={item.avatarUrl} size={36} />
      <View style={s.rowMid}>
        <Text style={[s.rowName, { color: me ? colors.brandInk : colors.text }]} numberOfLines={1}>
          {item.name}
          {me ? ' · você' : ''}
        </Text>
      </View>
      <Text style={[s.km, { color: me ? colors.brandInk : colors.text }]}>
        {item.km.toFixed(1)}
        <Text style={[s.kmUnit, { color: me ? 'rgba(10,15,14,0.6)' : colors.textMute }]}> km</Text>
      </Text>
    </View>
  );
}

function ClubRow({ item }: { item: ClubItem }) {
  const me = item.isMe;
  return (
    <View style={[s.row, s.rowClub, me ? s.rowMe : s.rowDefault]}>
      <Text
        style={[
          s.pos,
          { color: me ? colors.brandInk : item.pos <= 3 ? colors.brand : colors.textMute },
        ]}
      >
        {item.pos}
      </Text>
      <View style={s.rowMid}>
        <Text style={[s.clubName, { color: me ? colors.brandInk : colors.text }]} numberOfLines={1}>
          {item.name}
          {me ? ' · sua' : ''}
        </Text>
        <Text style={[s.clubSub, { color: me ? 'rgba(10,15,14,0.6)' : colors.textMute }]}>
          {item.runners} corredores
        </Text>
      </View>
      <Text style={[s.km, { color: me ? colors.brandInk : colors.text }]}>
        {item.km.toFixed(1)}
        <Text style={[s.kmUnit, { color: me ? 'rgba(10,15,14,0.6)' : colors.textMute }]}> km</Text>
      </Text>
    </View>
  );
}

const TABS: { id: Scope; label: string }[] = [
  { id: 'city', label: 'Cidade' },
  { id: 'state', label: 'Estado' },
  { id: 'club', label: 'Assessorias' },
];

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Scope>('city');

  const { data, isLoading, isError } = useQuery<RankingData>({
    queryKey: ['ranking', tab],
    queryFn: () => api.get(`/ranking?scope=${tab}`).then((r) => r.data as RankingData),
  });

  return (
    <ScreenTransition>
      <View style={[s.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.monthLabel}>{monthLabel()}</Text>
          <Text style={s.title}>RANKING</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable key={t.id} style={s.tabBtn} onPress={() => setTab(t.id)}>
                <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                {active && <View style={s.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : isError ? (
          <View style={s.center}>
            <Text style={s.hint}>Erro ao carregar ranking.</Text>
          </View>
        ) : data?.hint ? (
          <View style={s.center}>
            <Text style={s.hint}>{data.hint}</Text>
          </View>
        ) : (
          <ScrollView
            style={s.list}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 + insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            {data?.myPos != null && <Text style={s.myPos}>Você está em {data.myPos}º lugar</Text>}
            {(Array.isArray(data?.items) ? data.items : []).map((item) =>
              tab === 'club' ? (
                <ClubRow key={item.pos} item={item as ClubItem} />
              ) : (
                <RunnerRow key={item.pos} item={item as RunnerItem} />
              ),
            )}
          </ScrollView>
        )}
      </View>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  monthLabel: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 44,
    color: colors.text,
    lineHeight: 42,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
  },
  tabText: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.textMute,
    letterSpacing: 0.4,
  },
  tabTextActive: { color: colors.text },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: colors.brand,
  },
  list: { flex: 1, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.textMute,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  myPos: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowClub: { paddingVertical: 14 },
  rowDefault: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  rowMe: { backgroundColor: colors.brand },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: {
    fontFamily: font.bodyBold,
    color: '#fff',
  },
  pos: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: 0.4,
    minWidth: 38,
    textAlign: 'center',
  },
  rowMid: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: font.bodyBold,
    fontSize: 14,
  },
  clubName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    letterSpacing: 0.4,
    lineHeight: 20,
  },
  clubSub: {
    fontFamily: font.body,
    fontSize: 11,
    marginTop: 3,
  },
  km: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: 0.4,
    flexShrink: 0,
  },
  kmUnit: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
  },
});
