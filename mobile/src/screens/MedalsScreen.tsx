import Svg, { Polygon } from 'react-native-svg';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../lib/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - 12) / 2;

const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

const STATUS_LABEL: Record<string, string> = {
  PROGRESS:  'EM ANDAMENTO',
  SHIPPED:   'ENVIADA',
  DELIVERED: 'RECEBIDA',
  MISSED:    'NÃO RECEBIDA',
};

const STATUS_COLOR: Record<string, string> = {
  PROGRESS:  colors.brand,
  SHIPPED:   colors.brand,
  DELIVERED: colors.success,
  MISSED:    colors.textMute,
};

type MedalStatus = 'PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'MISSED';

interface Medal {
  id: string;
  year: number;
  month: number;
  title: string;
  goalKm: number;
  status: MedalStatus;
}

interface Address {
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  zipCode: string | null;
}

interface Challenge {
  doneKm: number;
  goalKm: number;
  pct: number;
}

interface Props {
  medals: Medal[];
  address: Address;
  challenge: Challenge | null;
  onClose: () => void;
  onEditAddress: () => void;
}

function hexPoints(size: number, inset = 0): string {
  const h = size - inset;
  const o = inset / 2;
  const half = h / 2 + o;
  const q = h / 4 + o;
  const q3 = (h * 3) / 4 + o;
  return `${half},${o} ${h + o},${q} ${h + o},${q3} ${half},${h + o} ${o},${q3} ${o},${q}`;
}

function MedalHex({ size = 84, label, state }: { size?: number; label: string; state: MedalStatus }) {
  const ring =
    state === 'SHIPPED' || state === 'DELIVERED'
      ? colors.brand
      : 'rgba(255,255,255,0.18)';
  const fill =
    state === 'DELIVERED'
      ? colors.brand
      : state === 'SHIPPED'
        ? 'rgba(244,98,10,0.18)'
        : 'rgba(255,255,255,0.04)';
  const ink = state === 'DELIVERED' ? '#0A0A0A' : colors.text;
  const opacity = state === 'MISSED' ? 0.35 : 1;

  return (
    <View style={{ width: size, height: size, opacity }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Polygon points={hexPoints(size)} fill={ring} />
        <Polygon points={hexPoints(size, 8)} fill={fill} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, hexCenter]}>
        <Text style={[h.label, { fontSize: size * 0.32, lineHeight: size * 0.34, color: ink }]}>
          {label}
        </Text>
        <Text style={[h.nsr, { fontSize: size * 0.085, color: ink }]}>NSR</Text>
      </View>
    </View>
  );
}

const hexCenter: object = { alignItems: 'center', justifyContent: 'center' };
const h = StyleSheet.create({
  label: { fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },
  nsr: { fontFamily: font.bodyBold, opacity: 0.7, letterSpacing: 1.2, marginTop: 2 },
});

function formatAddress(address: Address): string | null {
  if (!address.street) return null;
  let line = address.street;
  if (address.streetNumber) line += `, ${address.streetNumber}`;
  if (address.neighborhood) line += ` — ${address.neighborhood}`;
  if (address.deliveryCity) {
    line += `, ${address.deliveryCity}`;
    if (address.deliveryState) line += `/${address.deliveryState}`;
  }
  return line;
}

function MedalCard({ medal, challenge }: { medal: Medal; challenge: Challenge | null }) {
  const isProgress = medal.status === 'PROGRESS';
  const pct = isProgress && challenge ? Math.min(challenge.pct, 100) : 0;
  const doneKm = isProgress && challenge ? challenge.doneKm : 0;

  return (
    <View style={s.card}>
      <MedalHex size={84} label={`${medal.goalKm}K`} state={medal.status} />

      <Text style={s.cardMonth}>{MONTHS[medal.month - 1]} {medal.year}</Text>
      <Text style={s.cardGoal}>Meta {medal.goalKm}K</Text>
      <Text style={[s.cardStatus, { color: STATUS_COLOR[medal.status] ?? colors.textMute }]}>
        {STATUS_LABEL[medal.status] ?? medal.status}
      </Text>

      {isProgress && challenge && (
        <View style={s.progressWrap}>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={s.progressLabel}>{doneKm.toFixed(1)} / {medal.goalKm} km</Text>
        </View>
      )}
    </View>
  );
}

export function MedalsScreen({ medals, address, challenge, onClose, onEditAddress }: Props) {
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  const earned = medals.filter(
    (m) => m.status === 'SHIPPED' || m.status === 'DELIVERED',
  ).length;
  const pending = medals.length - earned;

  const formattedAddress = formatAddress(address);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.backBtn} onPress={onClose}>
          <Text style={s.backBtnText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.kicker}>Coleção · {year}</Text>
          <Text style={s.title}>MEDALHAS</Text>
          <Text style={s.subtitle}>
            <Text style={s.subtitleBold}>{earned}</Text>
            {' conquistadas · '}
            <Text style={s.subtitleBold}>{pending}</Text>
            {' pendentes'}
          </Text>
        </View>

        {/* Endereço de entrega */}
        <View style={s.addressCard}>
          <View style={s.addressIcon}>
            <Text style={{ fontSize: 16 }}>📍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>ENDEREÇO DE ENTREGA</Text>
            <Text style={s.addressText} numberOfLines={2}>
              {formattedAddress ?? 'Não configurado'}
            </Text>
          </View>
          <Pressable onPress={onEditAddress}>
            <Text style={s.addressEdit}>Editar</Text>
          </Pressable>
        </View>

        {/* Grid */}
        {medals.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Nenhuma medalha ainda.</Text>
            <Text style={s.emptyHint}>Complete um desafio mensal para ganhar sua primeira.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {medals.map((m) => (
              <MedalCard key={m.id} medal={m} challenge={challenge} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: colors.text, fontSize: 24, lineHeight: 30 },

  header: { paddingHorizontal: 20, paddingBottom: 4, paddingTop: 4 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, color: colors.brand, letterSpacing: 2 },
  title: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 44,
    color: colors.text, lineHeight: 46, letterSpacing: 0.5, marginTop: 4,
  },
  subtitle: { fontFamily: font.body, fontSize: 13, color: colors.textDim, marginTop: 4 },
  subtitleBold: { fontFamily: font.bodyBold, color: colors.text },

  // Address card
  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    margin: 20, marginTop: 16,
    padding: 14, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
  },
  addressIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(95,184,168,0.12)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addressLabel: {
    fontFamily: font.bodyBold, fontSize: 11, color: colors.textMute, letterSpacing: 1.4,
  },
  addressText: {
    fontFamily: font.body, fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 18,
  },
  addressEdit: { fontFamily: font.bodyBold, fontSize: 12, color: colors.brand },

  // Grid 2 colunas
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 12,
  },

  // Medal card
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.line,
    padding: 16,
    alignItems: 'center', gap: 8,
  },
  cardMonth: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: colors.text,
    letterSpacing: 0.4, lineHeight: 22,
  },
  cardGoal: { fontFamily: font.body, fontSize: 11, color: colors.textDim, fontWeight: '600' },
  cardStatus: {
    fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1.2, textAlign: 'center',
  },

  // Progress bar
  progressWrap: { width: '100%', gap: 4 },
  barTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2, overflow: 'hidden',
  },
  barFill: { height: 3, backgroundColor: colors.brand, borderRadius: 2 },
  progressLabel: {
    fontFamily: font.body, fontSize: 10, color: colors.textMute, textAlign: 'center',
  },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  emptyText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.textMute },
  emptyHint: {
    fontFamily: font.body, fontSize: 12, color: colors.textMute,
    textAlign: 'center', lineHeight: 18,
  },
});
