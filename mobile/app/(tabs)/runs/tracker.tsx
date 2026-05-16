import polylineCodec from '@mapbox/polyline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  type AppStateStatus,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import {
  getCaloriesBurned,
  getHeartRateStats,
  getLatestHeartRate,
  getStepCount,
} from '../../../src/lib/healthKit';
import { endRunActivity, startRunActivity, updateRunActivity } from '../../../src/lib/liveActivity';
import { colors, font } from '../../../src/lib/tokens';
import { COORDS_KEY, LOCATION_TASK, type TrackedCoord } from '../../../src/tasks/locationTask';

type Status = 'idle' | 'running' | 'paused' | 'finished';
type MapType = 'standard' | 'satellite' | 'hybrid';
type Split = { km: number; paceSec: number; elevDelta?: number };

const MAP_TYPES: MapType[] = ['standard', 'satellite', 'hybrid'];
const MAP_LABELS: Record<MapType, string> = {
  standard: 'Padrão',
  satellite: 'Satélite',
  hybrid: 'Híbrido',
};

const RING_SIZE = 100;
const RING_RADIUS = 46;
const circumference = 2 * Math.PI * RING_RADIUS;
const { height: SCREEN_H } = Dimensions.get('window');
const SPLITS_PEEK_H = 80; // splits visible at peek position

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Utility functions ──────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function totalKm(coords: TrackedCoord[]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += haversineKm(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng);
  }
  return Math.round(d * 100) / 100;
}

function currentPaceSec(coords: TrackedCoord[]): number | null {
  if (coords.length < 2) return null;
  let dist = 0;
  let i = coords.length - 1;
  while (i > 0 && dist < 0.5) {
    dist += haversineKm(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng);
    i--;
  }
  if (dist < 0.05) return null;
  const elapsed = (coords[coords.length - 1].timestamp - coords[i].timestamp) / 1000;
  return elapsed / dist;
}

function avgPaceSec(distKm: number, elapsedSec: number): number | null {
  if (distKm < 0.01) return null;
  return elapsedSec / distKm;
}

// Sum positive altitude deltas between consecutive coords (in meters).
// GPS altitude is noisy, so we only count rises ≥ 1m to filter jitter.
function elevationGainM(coords: TrackedCoord[]): number {
  let gain = 0;
  let lastAlt: number | null = null;
  for (const c of coords) {
    if (c.alt == null) continue;
    if (lastAlt != null && c.alt > lastAlt + 1) gain += c.alt - lastAlt;
    lastAlt = c.alt;
  }
  return Math.round(gain);
}

function fmtPace(sec: number | null): string {
  if (!sec || !isFinite(sec) || sec > 1800) return '--\'--"';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// ── GPS signal bars ────────────────────────────────────────────
function GpsSignal({ ready }: { ready: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (ready) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, ready]);

  return (
    <Animated.View
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, opacity: ready ? 1 : pulse }}
    >
      {[8, 13, 19, 25].map((h, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: h,
            borderRadius: 2,
            backgroundColor: ready ? colors.brand : colors.textMute,
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [coords, setCoords] = useState<TrackedCoord[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [gpsReady, setGpsReady] = useState(false);
  const [newBestPace, setNewBestPace] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [hrStats, setHrStats] = useState<{
    avg: number | null;
    max: number | null;
    calories: number;
  }>({ avg: null, max: null, calories: 0 });
  const [stepsCount, setStepsCount] = useState(0);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [splits, setSplits] = useState<Split[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Handle height = time + stats + controls + safe area (controls live inside handle)
  const safeBottom = Math.max(insets.bottom, 8);
  const handleH = 210 + safeBottom;
  const snapPeek = SCREEN_H - handleH - SPLITS_PEEK_H;
  const snapHalf = Math.round(SCREEN_H * 0.44);
  const snapFull = insets.top + 52;

  const endedAtRef = useRef<Date | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const pausedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const countdownActiveRef = useRef(false);
  const livePulse = useRef(new Animated.Value(1)).current;
  const splitKmRef = useRef(1);
  const splitStartTimeRef = useRef(0);
  const splitStartDistRef = useRef(0);
  const splitStartAltRef = useRef<number | null>(null);

  // Bottom sheet
  const sheetAnim = useRef(new Animated.Value(snapPeek)).current;
  const sheetTopRef = useRef(snapPeek);
  const snapRef = useRef({ full: snapFull, half: snapHalf, peek: snapPeek });

  // Update snap refs when insets change
  useEffect(() => {
    const newSafeBottom = Math.max(insets.bottom, 8);
    const newHandleH = 210 + newSafeBottom;
    const newPeek = SCREEN_H - newHandleH - SPLITS_PEEK_H;
    const newHalf = Math.round(SCREEN_H * 0.44);
    const newFull = insets.top + 52;
    snapRef.current = { full: newFull, half: newHalf, peek: newPeek };
    sheetAnim.setValue(newPeek);
    sheetTopRef.current = newPeek;
  }, [insets.top, insets.bottom, sheetAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        sheetAnim.stopAnimation((val) => {
          sheetTopRef.current = val;
        });
      },
      onPanResponderMove: (_, g) => {
        const { full, peek } = snapRef.current;
        sheetAnim.setValue(Math.max(full, Math.min(peek, sheetTopRef.current + g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        const { full, half, peek } = snapRef.current;
        const cur = sheetTopRef.current + g.dy;
        const vy = g.vy;
        let target: number;
        if (vy < -0.3) {
          target = cur < half ? full : half;
        } else if (vy > 0.3) {
          target = cur > half ? peek : half;
        } else {
          const d = [Math.abs(cur - full), Math.abs(cur - half), Math.abs(cur - peek)];
          const min = Math.min(...d);
          target = min === d[0] ? full : min === d[1] ? half : peek;
        }
        sheetTopRef.current = target;
        Animated.spring(sheetAnim, {
          toValue: target,
          useNativeDriver: false,
          tension: 68,
          friction: 11,
        }).start();
      },
    }),
  ).current;

  const dashOffset = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Precisamos de acesso à localização para rastrear sua corrida.',
        );
        router.back();
        return;
      }
      await Location.requestBackgroundPermissionsAsync();
      Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }, (loc) => {
        setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setGpsReady(true);
      })
        .then((sub) => {
          setTimeout(() => sub.remove(), 3000);
        })
        .catch(() => {});
    })();
  }, [router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state !== 'active' || status !== 'running') return;
      try {
        const raw = await AsyncStorage.getItem(COORDS_KEY);
        if (!raw) return;
        const bgCoords = JSON.parse(raw) as TrackedCoord[];
        setCoords((prev) => {
          const lastTs = prev.length ? prev[prev.length - 1].timestamp : 0;
          const newOnes = bgCoords.filter((c) => c.timestamp > lastTs);
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      } catch {}
    });
    return () => sub.remove();
  }, [status]);

  useEffect(() => {
    if (status !== 'running') return;
    const poll = async () => {
      const hr = await getLatestHeartRate();
      if (hr) setHeartRate(hr);
    };
    void poll();
    const interval = setInterval(() => void poll(), 30000);
    return () => clearInterval(interval);
  }, [status]);

  // Reset state when screen gets focus after a finished/discarded run.
  // Read state via refs so the callback identity stays stable — otherwise
  // setStatus('finished') would re-trigger the effect mid-focus and skip the summary.
  const statusRef = useRef(status);
  const newBestPaceRef = useRef(newBestPace);
  statusRef.current = status;
  newBestPaceRef.current = newBestPace;
  useFocusEffect(
    useCallback(() => {
      if (statusRef.current === 'finished' || newBestPaceRef.current) {
        setStatus('idle');
        setCoords([]);
        setElapsedSec(0);
        setSplits([]);
        setHrStats({ avg: null, max: null, calories: 0 });
        setStepsCount(0);
        setNewBestPace(false);
        splitKmRef.current = 1;
        splitStartTimeRef.current = 0;
        splitStartDistRef.current = 0;
        splitStartAltRef.current = null;
      }
    }, []),
  );

  // Update Live Activity every 5 seconds while running
  useEffect(() => {
    if (status !== 'running') return;
    const dist = totalKm(coords);
    const pace = avgPaceSec(dist, elapsedSec) ?? 0;
    const kmProg = Math.min(dist - Math.floor(dist), 1);
    updateRunActivity(dist, elapsedSec, pace, kmProg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(elapsedSec / 5), status]);

  useEffect(() => {
    if (status !== 'running') {
      livePulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [livePulse, status]);

  // Track km splits + elevation
  useEffect(() => {
    if (status !== 'running') return;
    const distKm = totalKm(coords);
    if (distKm < splitKmRef.current) return;
    const lastCoord = coords[coords.length - 1];
    const segDist = distKm - splitStartDistRef.current;
    const segTime = elapsedSec - splitStartTimeRef.current;
    const elevDelta =
      lastCoord.alt != null && splitStartAltRef.current != null
        ? Math.round(lastCoord.alt - splitStartAltRef.current)
        : undefined;
    if (segDist > 0) {
      setSplits((prev) => [
        ...prev,
        { km: prev.length + 1, paceSec: segTime / segDist, elevDelta },
      ]);
    }
    splitKmRef.current += 1;
    splitStartDistRef.current = distKm;
    splitStartTimeRef.current = elapsedSec;
    if (lastCoord.alt != null) splitStartAltRef.current = lastCoord.alt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(totalKm(coords)), status]);

  // ── Handlers ──────────────────────────────────────────────────
  function onHoldStart() {
    if (!gpsReady || countdownActiveRef.current) return;
    holdAnimRef.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    });
    holdAnimRef.current.start(({ finished }) => {
      if (finished) beginCountdown();
    });
  }

  function onHoldRelease() {
    if (countdownActiveRef.current) return;
    holdAnimRef.current?.stop();
    holdAnimRef.current = null;
    Animated.timing(holdProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  function beginCountdown() {
    countdownActiveRef.current = true;
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(null);
        countdownActiveRef.current = false;
        holdProgress.setValue(0);
        void startRun();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }

  function centerGps() {
    const loc = coords.length
      ? { latitude: coords[coords.length - 1].lat, longitude: coords[coords.length - 1].lng }
      : currentLocation;
    if (!loc) return;
    mapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 400);
  }

  function cycleMapType() {
    setMapType((curr) => MAP_TYPES[(MAP_TYPES.indexOf(curr) + 1) % MAP_TYPES.length]);
  }

  async function startRun() {
    setSplits([]);
    splitKmRef.current = 1;
    splitStartTimeRef.current = 0;
    splitStartDistRef.current = 0;
    splitStartAltRef.current = null;

    await AsyncStorage.removeItem(COORDS_KEY);
    setCoords([]);
    setElapsedSec(0);
    pausedAtRef.current = 0;
    startedAtRef.current = new Date();

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const coord: TrackedCoord = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: loc.timestamp,
          alt: loc.coords.altitude ?? undefined,
        };
        setCoords((prev) => {
          // Initialize elevation baseline from first coord
          if (prev.length === 0 && coord.alt != null) splitStartAltRef.current = coord.alt;
          return [...prev, coord];
        });
      },
    );

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'NutriStreet Run',
        notificationBody: 'Rastreando sua corrida...',
        notificationColor: colors.brand,
      },
    });

    timerRef.current = setInterval(() => {
      setElapsedSec(
        Math.floor((Date.now() - startedAtRef.current!.getTime()) / 1000) - pausedAtRef.current,
      );
    }, 1000);

    setStatus('running');
    void startRunActivity(0, 0, 0);

    // Snap sheet to peek when run starts
    const { peek } = snapRef.current;
    sheetTopRef.current = peek;
    Animated.spring(sheetAnim, {
      toValue: peek,
      useNativeDriver: false,
      tension: 68,
      friction: 11,
    }).start();
  }

  async function pauseRun() {
    watchRef.current?.remove();
    watchRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    pausedAtRef.current = elapsedSec;
    setStatus('paused');
  }

  async function resumeRun() {
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        setCoords((prev) => [
          ...prev,
          {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            timestamp: loc.timestamp,
            alt: loc.coords.altitude ?? undefined,
          },
        ]);
      },
    );
    const resumedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(pausedAtRef.current + Math.floor((Date.now() - resumedAt) / 1000));
    }, 1000);
    setStatus('running');
  }

  function stopRun() {
    Alert.alert('Encerrar corrida?', 'Deseja finalizar e salvar esta corrida?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          watchRef.current?.remove();
          watchRef.current = null;
          if (timerRef.current) clearInterval(timerRef.current);
          await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
          void endRunActivity();
          endedAtRef.current = new Date();
          setStatus('finished');
          if (startedAtRef.current) {
            const [stats, cal, steps] = await Promise.all([
              getHeartRateStats(startedAtRef.current, endedAtRef.current!),
              getCaloriesBurned(startedAtRef.current, endedAtRef.current!),
              getStepCount(startedAtRef.current, endedAtRef.current!),
            ]);
            setHrStats({ avg: stats.avg, max: stats.max, calories: cal });
            setStepsCount(steps);
          }
        },
      },
    ]);
  }

  function saveRun() {
    const distKm = totalKm(coords);
    if (distKm < 0.1) {
      Alert.alert('Corrida muito curta', 'Percorra pelo menos 100 metros para salvar.');
      return;
    }
    const elevation = elevationGainM(coords);
    const routePolyline =
      coords.length > 1 ? polylineCodec.encode(coords.map((c) => [c.lat, c.lng])) : '';
    router.push({
      pathname: '/(tabs)/runs/post-run',
      params: {
        distanceKm: String(distKm),
        durationSeconds: String(elapsedSec),
        startedAt: startedAtRef.current!.toISOString(),
        ...(routePolyline && { routePolyline }),
        ...(hrStats.avg && { avgHeartRate: String(hrStats.avg) }),
        ...(hrStats.max && { maxHeartRate: String(hrStats.max) }),
        ...(hrStats.calories > 0 && { calories: String(hrStats.calories) }),
        ...(elevation > 0 && { elevationGain: String(elevation) }),
        ...(stepsCount > 0 && { steps: String(stepsCount) }),
      },
    });
  }

  function discard() {
    Alert.alert('Descartar corrida?', 'Os dados desta corrida serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(COORDS_KEY);
          void endRunActivity();
          router.back();
        },
      },
    ]);
  }

  function handleBack() {
    if (status === 'idle') {
      router.back();
      return;
    }
    Alert.alert('Sair da corrida?', 'Sua corrida em andamento será perdida.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          watchRef.current?.remove();
          if (timerRef.current) clearInterval(timerRef.current);
          await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
          await AsyncStorage.removeItem(COORDS_KEY);
          router.back();
        },
      },
    ]);
  }

  // ── Computed ──────────────────────────────────────────────────
  const distKm = totalKm(coords);
  const curPace = currentPaceSec(coords);
  const avgPace = avgPaceSec(distKm, elapsedSec);
  const estCalories = Math.round(distKm * 62);
  const polyline = coords.map((c) => ({ latitude: c.lat, longitude: c.lng }));
  const maxSplitPace = splits.length > 0 ? Math.max(...splits.map((sp) => sp.paceSec)) : 1;
  const currentKmNum = splits.length + 1;
  const currentKmProgress = Math.min(distKm - splits.length, 1);
  const currentSegTime = elapsedSec - splitStartTimeRef.current;
  const currentKmPace = currentKmProgress > 0.05 ? currentSegTime / currentKmProgress : null;

  const initialRegion: Region = coords.length
    ? {
        latitude: coords[coords.length - 1].lat,
        longitude: coords[coords.length - 1].lng,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }
    : currentLocation
      ? { ...currentLocation, latitudeDelta: 0.003, longitudeDelta: 0.003 }
      : { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  // ── CELEBRATION ───────────────────────────────────────────────
  if (newBestPace) {
    return (
      <View
        style={[s.root, s.center, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}
      >
        <Text style={s.trophyEmoji}>🏆</Text>
        <Text style={s.celebTitle}>NOVO RECORDE!</Text>
        <Text style={s.celebSub}>Você bateu seu melhor pace pessoal</Text>
        <Text style={s.celebPace}>{fmtPace(avgPace)}/km</Text>
        <Pressable
          style={[s.primaryBtn, { alignSelf: 'stretch', marginHorizontal: 32 }]}
          onPress={() => router.back()}
        >
          <Text style={s.primaryBtnText}>VER MINHAS CORRIDAS</Text>
        </Pressable>
      </View>
    );
  }

  // ── FINISHED SUMMARY ──────────────────────────────────────────
  if (status === 'finished') {
    return (
      <View style={[s.root, { paddingBottom: insets.bottom + 20 }]}>
        <MapView
          ref={mapRef}
          style={s.mapFinished}
          region={initialRegion}
          scrollEnabled={false}
          mapType={mapType}
        >
          {polyline.length > 1 && (
            <Polyline coordinates={polyline} strokeColor={colors.brand} strokeWidth={5} />
          )}
        </MapView>
        <View style={[s.summaryPanel, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={s.summaryTitle}>CORRIDA CONCLUÍDA</Text>
          <View style={s.summaryGrid}>
            <View style={s.summaryMetric}>
              <Text style={s.summaryValue}>{distKm.toFixed(2)}</Text>
              <Text style={s.summaryUnit}>km</Text>
              <Text style={s.summaryLabel}>Distância</Text>
            </View>
            <View style={s.summaryMetric}>
              <Text style={s.summaryValue}>{fmtTime(elapsedSec)}</Text>
              <Text style={s.summaryLabel}>Tempo</Text>
            </View>
            <View style={s.summaryMetric}>
              <Text style={s.summaryValue}>{fmtPace(avgPace)}</Text>
              <Text style={s.summaryLabel}>Pace médio</Text>
            </View>
            {hrStats.avg ? (
              <View style={s.summaryMetric}>
                <Text style={[s.summaryValue, { color: colors.danger }]}>{hrStats.avg}</Text>
                <Text style={s.summaryUnit}>bpm</Text>
                <Text style={s.summaryLabel}>FC média</Text>
              </View>
            ) : null}
            {hrStats.calories > 0 ? (
              <View style={s.summaryMetric}>
                <Text style={s.summaryValue}>{hrStats.calories}</Text>
                <Text style={s.summaryUnit}>kcal</Text>
                <Text style={s.summaryLabel}>Calorias</Text>
              </View>
            ) : null}
          </View>
          <Pressable style={s.primaryBtn} onPress={saveRun}>
            <Text style={s.primaryBtnText}>SALVAR CORRIDA</Text>
          </Pressable>
          <Pressable style={s.discardBtn} onPress={discard}>
            <Text style={s.discardText}>Descartar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── IDLE ─────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <View style={s.root}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={initialRegion}
          showsUserLocation
          mapType={mapType}
          scrollEnabled={false}
        />

        {countdown !== null && (
          <View style={s.countdownOverlay}>
            <Text style={s.countdownNum}>{countdown}</Text>
          </View>
        )}

        <Pressable style={[s.backBtn, { top: insets.top + 8 }]} onPress={handleBack}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>

        <View style={[s.idleOverlay, { paddingBottom: insets.bottom + 28 }]}>
          <View style={s.gpsRow}>
            <GpsSignal ready={gpsReady} />
            <Text style={[s.gpsLabel, gpsReady && { color: colors.brand }]}>
              {gpsReady ? 'GPS Pronto' : 'Buscando sinal...'}
            </Text>
          </View>

          <View style={s.startContainer}>
            <Pressable
              style={[s.startCircle, !gpsReady && s.startDisabled]}
              onPressIn={onHoldStart}
              onPressOut={onHoldRelease}
              disabled={!gpsReady || countdown !== null}
            >
              <View style={gpsReady ? s.playIcon : s.playIconMuted} />
            </Pressable>
            <View style={s.ringWrapper} pointerEvents="none">
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="rgba(95,184,168,0.18)"
                  strokeWidth={5}
                  fill="none"
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={colors.brand}
                  strokeWidth={5}
                  fill="none"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              </Svg>
            </View>
          </View>

          <Text style={s.startLabel}>{gpsReady ? 'SEGURE PARA INICIAR' : 'AGUARDANDO GPS'}</Text>

          <View style={s.mapCtrlRow}>
            <Pressable style={s.mapCtrlPill} onPress={centerGps}>
              <Text style={s.mapCtrlIcon}>⊕</Text>
              <Text style={s.mapCtrlText}>GPS</Text>
            </Pressable>
            <View style={s.mapCtrlSep} />
            <Pressable style={s.mapCtrlPill} onPress={cycleMapType}>
              <Text style={s.mapCtrlIcon}>◼</Text>
              <Text style={s.mapCtrlText}>{MAP_LABELS[mapType]}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── RUNNING / PAUSED — sheet layout ──────────────────────────
  return (
    <View style={s.root}>
      {/* Map — full screen */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        followsUserLocation
        mapType={mapType}
      >
        {polyline.length > 1 && (
          <Polyline coordinates={polyline} strokeColor={colors.brand} strokeWidth={5} />
        )}
      </MapView>

      {/* Floating map controls */}
      <View style={[s.mapFloating, { top: insets.top + 8 }]}>
        <Pressable
          style={[s.backBtn, { position: 'relative', top: 0, left: 0 }]}
          onPress={handleBack}
        >
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <View style={s.mapFloatRight}>
          <Pressable style={s.mapFloatBtn} onPress={centerGps}>
            <Text style={s.mapFloatIcon}>⊕</Text>
          </Pressable>
          <Pressable style={[s.mapFloatBtn, s.mapFloatBtnWide]} onPress={cycleMapType}>
            <Text style={s.mapFloatText}>{MAP_LABELS[mapType]}</Text>
          </Pressable>
        </View>
      </View>

      {/* Paused badge */}
      {status === 'paused' && (
        <View style={[s.pausedBadge, { top: insets.top + 60 }]}>
          <Text style={s.pausedBadgeText}>PAUSADO</Text>
        </View>
      )}

      {/* Draggable bottom sheet */}
      <Animated.View style={[s.sheet, { top: sheetAnim }]}>
        {/* Handle — drag zone, compact stats + controls */}
        <View
          style={[s.sheetHandle, { paddingBottom: safeBottom + 8 }]}
          {...panResponder.panHandlers}
        >
          <View style={s.handleBar} />

          <Text style={s.compactTime}>{fmtTime(elapsedSec)}</Text>

          <View style={s.compactRow}>
            <View style={s.compactStat}>
              <Text style={s.compactVal}>{distKm.toFixed(2)}</Text>
              <Text style={s.compactUnit}>km</Text>
            </View>
            <View style={s.compactDiv} />
            <View style={s.compactStat}>
              <Text style={s.compactVal}>{fmtPace(curPace)}</Text>
              <Text style={s.compactUnit}>min/km</Text>
            </View>
            <View style={s.compactDiv} />
            <View style={s.compactStat}>
              <Text style={s.compactVal}>{estCalories}</Text>
              <Text style={s.compactUnit}>kcal</Text>
            </View>
            {heartRate ? (
              <>
                <View style={s.compactDiv} />
                <View style={s.compactStat}>
                  <Text style={[s.compactVal, { color: colors.danger }]}>{heartRate}</Text>
                  <Text style={s.compactUnit}>bpm</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Controls inside handle — no more floating overlap */}
          <View style={s.handleCtrlRow}>
            {status === 'running' ? (
              <Pressable style={s.circleCtrl} onPress={pauseRun}>
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  <View style={s.pauseBar} />
                  <View style={s.pauseBar} />
                </View>
              </Pressable>
            ) : (
              <Pressable style={s.circleCtrl} onPress={resumeRun}>
                <View style={s.playIconSm} />
              </Pressable>
            )}
            <Pressable style={s.stopCtrl} onPress={stopRun}>
              <View style={s.stopIcon} />
            </Pressable>
          </View>
        </View>

        {/* Splits scroll — clean, no floating elements on top */}
        <ScrollView
          style={s.splitsScroll}
          contentContainerStyle={s.splitsContent}
          showsVerticalScrollIndicator={false}
        >
          {distKm > 0 && (
            <View style={s.liveKmRow}>
              <Text style={s.liveKmNum}>KM {currentKmNum}</Text>
              <View style={s.liveBarBg}>
                <View style={[s.liveBar, { width: `${currentKmProgress * 100}%` as const }]} />
                {status === 'running' && currentKmProgress > 0.02 && (
                  <Animated.View
                    style={[
                      s.liveDot,
                      { left: `${currentKmProgress * 100}%` as const, opacity: livePulse },
                    ]}
                  />
                )}
              </View>
              <Text style={s.liveKmPace}>{fmtPace(currentKmPace)}</Text>
            </View>
          )}

          {splits.length > 0 && (
            <View style={s.splitsDivider}>
              <View style={s.splitsDividerLine} />
              <Text style={s.splitsDividerText}>concluídos</Text>
              <View style={s.splitsDividerLine} />
            </View>
          )}

          {[...splits].reverse().map((sp) => {
            const barPct = sp.paceSec / maxSplitPace;
            const isFast = avgPace ? sp.paceSec <= avgPace : true;
            return (
              <View key={sp.km} style={s.splitRow}>
                <Text style={s.splitKmLabel}>{sp.km} km</Text>
                <View style={s.splitBarBg}>
                  <View
                    style={[
                      s.splitBar,
                      {
                        width: `${barPct * 100}%` as const,
                        backgroundColor: isFast ? colors.brand : colors.danger,
                      },
                    ]}
                  />
                </View>
                <Text style={s.splitPaceText}>{fmtPace(sp.paceSec)}</Text>
                {sp.elevDelta != null && (
                  <Text
                    style={[
                      s.splitElev,
                      { color: sp.elevDelta >= 0 ? colors.brand : colors.danger },
                    ]}
                  >
                    {sp.elevDelta >= 0 ? '+' : ''}
                    {sp.elevDelta}m
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14,17,16,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backArrow: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },

  mapFinished: { height: 220 },

  // ── Map floating controls (running) ──
  mapFloating: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  mapFloatRight: { flexDirection: 'row', gap: 8 },
  mapFloatBtn: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14,17,16,0.82)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFloatBtnWide: { width: 'auto', paddingHorizontal: 12, borderRadius: 18 },
  mapFloatIcon: { fontSize: 16, color: colors.brand },
  mapFloatText: { fontFamily: font.body, fontSize: 12, color: colors.text },

  // ── Paused badge (floating on map) ──
  pausedBadge: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  pausedBadgeText: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.danger,
    letterSpacing: 2.5,
    backgroundColor: 'rgba(14,17,16,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,107,107,0.35)',
  },

  // ── Countdown overlay ──
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,17,16,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  countdownNum: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 180,
    color: colors.brand,
    lineHeight: 182,
    letterSpacing: -4,
  },

  // ── IDLE overlay ──
  idleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(14,17,16,0.92)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingTop: 28,
    alignItems: 'center',
    gap: 20,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gpsLabel: { fontFamily: font.body, fontSize: 13, color: colors.textMute, letterSpacing: 0.3 },
  startContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 14,
  },
  startDisabled: { backgroundColor: colors.cardHi, shadowOpacity: 0, elevation: 0 },
  ringWrapper: { position: 'absolute', top: 0, left: 0, width: RING_SIZE, height: RING_SIZE },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.brandInk,
    marginLeft: 6,
  },
  playIconMuted: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.textMute,
    marginLeft: 6,
  },
  startLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 14,
    color: colors.textMute,
    letterSpacing: 3,
  },
  mapCtrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapCtrlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mapCtrlSep: { width: 0.5, height: 20, backgroundColor: colors.line },
  mapCtrlIcon: { fontSize: 14, color: colors.brand },
  mapCtrlText: { fontFamily: font.body, fontSize: 13, color: colors.textDim },

  // ── Bottom sheet ──
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 0.5,
    borderTopColor: colors.lineHi,
    zIndex: 10,
    overflow: 'hidden',
  },
  sheetHandle: {
    paddingTop: 12,
    paddingHorizontal: 24,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  handleCtrlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 2,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
  },
  compactTime: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 44,
    color: colors.textDim,
    lineHeight: 46,
    textAlign: 'center',
    letterSpacing: 2,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStat: { flex: 1, alignItems: 'center', gap: 2 },
  compactVal: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.brand,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  compactUnit: { fontFamily: font.body, fontSize: 10, color: colors.textMute },
  compactDiv: { width: 0.5, height: 28, backgroundColor: colors.line },

  // ── Splits scroll area ──
  splitsScroll: { flex: 1 },
  splitsContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },

  // Live km
  liveKmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  liveKmNum: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    width: 36,
    letterSpacing: 0.5,
  },
  liveBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: colors.bg,
    borderRadius: 5,
    overflow: 'visible',
  },
  liveBar: { height: 10, borderRadius: 5, backgroundColor: colors.brand },
  liveDot: {
    position: 'absolute',
    top: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.card,
    transform: [{ translateX: -6 }],
  },
  liveKmPace: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    color: colors.textDim,
    width: 44,
    textAlign: 'right',
  },

  // Divider
  splitsDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  splitsDividerLine: { flex: 1, height: 0.5, backgroundColor: colors.line },
  splitsDividerText: {
    fontFamily: font.body,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1,
  },

  // Completed splits
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  splitKmLabel: { fontFamily: font.bodyMedium, fontSize: 11, color: colors.textMute, width: 36 },
  splitBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  splitBar: { height: 8, borderRadius: 4 },
  splitPaceText: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    color: colors.textDim,
    width: 44,
    textAlign: 'right',
  },
  splitElev: { fontFamily: font.bodyBold, fontSize: 11, width: 40, textAlign: 'right' },

  // ── Controls (inside handle) ──
  circleCtrl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  pauseBar: { width: 5, height: 22, borderRadius: 3, backgroundColor: colors.brandInk },
  playIconSm: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.brandInk,
    marginLeft: 4,
  },
  stopCtrl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: { width: 22, height: 22, borderRadius: 5, backgroundColor: colors.danger },

  // ── Summary ──
  summaryPanel: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    gap: 16,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
  },
  summaryTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 16,
  },
  summaryMetric: { alignItems: 'center', minWidth: '28%' },
  summaryValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    color: colors.text,
    lineHeight: 32,
    letterSpacing: 0.5,
  },
  summaryUnit: { fontFamily: font.body, fontSize: 12, color: colors.textMute },
  summaryLabel: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 2 },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.brandInk,
    letterSpacing: 1.5,
  },
  discardBtn: { alignItems: 'center', paddingVertical: 12 },
  discardText: { fontFamily: font.body, fontSize: 14, color: colors.danger },

  // ── Celebration ──
  trophyEmoji: { fontSize: 80, marginBottom: 16 },
  celebTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 52,
    color: colors.brand,
    letterSpacing: 2,
    lineHeight: 54,
  },
  celebSub: { fontFamily: font.body, fontSize: 15, color: colors.textDim, marginTop: 8 },
  celebPace: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 40,
    color: colors.text,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 32,
  },
});
