import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
  Text as SvgText,
} from 'react-native-svg';

import { api } from '../../../src/lib/api';
import { colors, font } from '../../../src/lib/tokens';

interface MonthData {
  year: number;
  month: number;
  label: string;
  totalKm: number;
  runCount: number;
  activeDays: number;
  avgPaceSec: number | null;
}

function fmtPace(sec: number): string {
  return `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"`;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({
  data,
  getValue,
  formatLabel,
  color,
  width,
}: {
  data: MonthData[];
  getValue: (d: MonthData) => number;
  formatLabel: (v: number) => string;
  color: string;
  width: number;
}) {
  const H = 120;
  const padL = 36;
  const padB = 20;
  const padT = 10;
  const plotW = width - padL - 8;
  const plotH = H - padT - padB;

  const values = data.map(getValue);
  const maxVal = Math.max(...values, 1);

  const barW = Math.min((plotW / data.length) * 0.55, 28);
  const gap = plotW / data.length;

  return (
    <Svg width={width} height={H}>
      <Defs>
        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.9" />
          <Stop offset="1" stopColor={color} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[0, 0.5, 1].map((t) => {
        const y = padT + plotH * (1 - t);
        const val = maxVal * t;
        return (
          <React.Fragment key={t}>
            <Path
              d={`M ${padL} ${y} L ${padL + plotW} ${y}`}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <SvgText x={padL - 4} y={y + 4} fontSize={8} fill={colors.textMute} textAnchor="end">
              {formatLabel(val)}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const val = getValue(d);
        const barH = val > 0 ? (val / maxVal) * plotH : 2;
        const x = padL + gap * i + gap / 2 - barW / 2;
        const y = padT + plotH - barH;
        const isLast = i === data.length - 1;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={isLast ? color : `url(#barGrad)`}
              opacity={isLast ? 1 : 0.7}
            />
            <SvgText
              x={x + barW / 2}
              y={H - 4}
              fontSize={8}
              fill={isLast ? color : colors.textMute}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({
  data,
  getValue,
  formatLabel,
  color,
  width,
  invertY,
}: {
  data: MonthData[];
  getValue: (d: MonthData) => number | null;
  formatLabel: (v: number) => string;
  color: string;
  width: number;
  invertY?: boolean;
}) {
  const H = 130;
  const padL = 42;
  const padB = 20;
  const padT = 14;
  const plotW = width - padL - 8;
  const plotH = H - padT - padB;

  const rawValues = data.map(getValue).filter((v): v is number => v != null);
  if (rawValues.length < 2) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: colors.textMute }}>
          Dados insuficientes
        </Text>
      </View>
    );
  }

  const minVal = Math.min(...rawValues);
  const maxVal = Math.max(...rawValues);
  const range = maxVal - minVal || 1;

  const xOf = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => {
    const norm = (v - minVal) / range;
    return invertY
      ? padT + norm * plotH // lower value = lower on chart = worse (inverted for pace: lower sec = faster)
      : padT + (1 - norm) * plotH;
  };

  const points = data
    .map((d, i) => {
      const v = getValue(d);
      return v != null ? { x: xOf(i), y: yOf(v), v, label: d.label, i } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD =
    `M ${points[0].x} ${padT + plotH} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${padT + plotH} Z`;

  const gradId = `lineGrad_${color.replace('#', '')}`;

  return (
    <Svg width={width} height={H}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Grid */}
      {[0, 0.5, 1].map((t) => {
        const val = minVal + range * (invertY ? 1 - t : t);
        const y = padT + plotH * (1 - t);
        return (
          <React.Fragment key={t}>
            <Path
              d={`M ${padL} ${y} L ${padL + plotW} ${y}`}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <SvgText x={padL - 4} y={y + 4} fontSize={8} fill={colors.textMute} textAnchor="end">
              {formatLabel(val)}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Area fill */}
      <Path d={areaD} fill={`url(#${gradId})`} />

      {/* Line */}
      <Path
        d={lineD}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots + labels */}
      {points.map((p, idx) => {
        const isLast = idx === points.length - 1;
        return (
          <React.Fragment key={idx}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={isLast ? 5 : 3.5}
              fill={isLast ? color : colors.card}
              stroke={color}
              strokeWidth={isLast ? 0 : 1.5}
            />
            <SvgText
              x={p.x}
              y={H - 4}
              fontSize={8}
              fill={isLast ? color : colors.textMute}
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={cs.card}>
      <View style={cs.cardHead}>
        <Text style={cs.cardTitle}>{title}</Text>
        {subtitle ? <Text style={cs.cardSub}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChartsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const chartW = screenW - 40 - 32; // screen - horizontal padding - card padding

  const { data, isLoading } = useQuery<MonthData[]>({
    queryKey: ['activities-chart'],
    queryFn: () =>
      api
        .get('/activities/chart-data', { params: { months: 6 } })
        .then((r) => r.data as MonthData[]),
  });

  return (
    <ScrollView
      style={cs.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[cs.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [cs.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Text style={cs.backArrow}>←</Text>
          <Text style={cs.backLabel}>Corridas</Text>
        </Pressable>
        <Text style={cs.headerTitle}>EVOLUÇÃO</Text>
        <View style={{ width: 80 }} />
      </View>

      <Text style={cs.headerSub}>Últimos 6 meses</Text>

      {isLoading || !data ? (
        <View style={cs.loading}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <View style={cs.content}>
          {/* Distância */}
          <ChartCard title="DISTÂNCIA" subtitle="km por mês">
            <BarChart
              data={data}
              getValue={(d) => d.totalKm}
              formatLabel={(v) => `${v.toFixed(0)}`}
              color={colors.brand}
              width={chartW}
            />
          </ChartCard>

          {/* Pace */}
          <ChartCard title="PACE MÉDIO" subtitle="min/km — linha sobe = mais rápido">
            <LineChart
              data={data}
              getValue={(d) => d.avgPaceSec}
              formatLabel={(v) => fmtPace(Math.round(v))}
              color="#A78BFA"
              width={chartW}
              invertY
            />
          </ChartCard>

          {/* Corridas */}
          <ChartCard title="CORRIDAS" subtitle="quantidade por mês">
            <BarChart
              data={data}
              getValue={(d) => d.runCount}
              formatLabel={(v) => `${Math.round(v)}`}
              color={colors.success}
              width={chartW}
            />
          </ChartCard>

          {/* Dias ativos */}
          <ChartCard title="DIAS ATIVOS" subtitle="dias com corrida no mês">
            <BarChart
              data={data}
              getValue={(d) => d.activeDays}
              formatLabel={(v) => `${Math.round(v)}`}
              color={colors.danger}
              width={chartW}
            />
          </ChartCard>
        </View>
      )}
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  backArrow: { fontSize: 20, color: colors.brand },
  backLabel: { fontFamily: font.bodyBold, fontSize: 13, color: colors.brand },
  headerTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 1,
    lineHeight: 24,
  },
  headerSub: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.textMute,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  content: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  cardHead: { marginBottom: 12 },
  cardTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  cardSub: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    marginTop: 2,
  },
});
