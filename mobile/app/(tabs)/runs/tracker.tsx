import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../src/lib/api';
import {
  getCaloriesBurned,
  getHeartRateStats,
  getLatestHeartRate,
  saveRunToHealth,
} from '../../../src/lib/healthKit';
import { colors, font } from '../../../src/lib/tokens';
import { COORDS_KEY, LOCATION_TASK, type TrackedCoord } from '../../../src/tasks/locationTask';

type Status = 'idle' | 'running' | 'paused' | 'finished';

// Haversine distance in km between two coordinates
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

// Rolling pace over last ~500 m of coordinates
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

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [coords, setCoords] = useState<TrackedCoord[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [gpsReady, setGpsReady] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const endedAtRef = useRef<Date | null>(null);

  const startedAtRef = useRef<Date | null>(null);
  const pausedAtRef = useRef<number>(0); // accumulated paused seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Warm up GPS on mount
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
      // Get current position immediately to center map and confirm GPS is ready
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

  // Sync from AsyncStorage when returning from background
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

  // Poll heart rate from Apple Watch every 30s while running
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

  // Follow GPS on map
  useEffect(() => {
    if (coords.length === 0) return;
    const last = coords[coords.length - 1];
    mapRef.current?.animateToRegion(
      {
        latitude: last.lat,
        longitude: last.lng,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      300,
    );
  }, [coords]);

  async function startRun() {
    await AsyncStorage.removeItem(COORDS_KEY);
    setCoords([]);
    setElapsedSec(0);
    pausedAtRef.current = 0;
    startedAtRef.current = new Date();

    // Foreground watch
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const coord: TrackedCoord = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: loc.timestamp,
        };
        setCoords((prev) => [...prev, coord]);
      },
    );

    // Background task
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

    // Timer
    timerRef.current = setInterval(() => {
      setElapsedSec(
        Math.floor((Date.now() - startedAtRef.current!.getTime()) / 1000) - pausedAtRef.current,
      );
    }, 1000);

    setStatus('running');
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
          { lat: loc.coords.latitude, lng: loc.coords.longitude, timestamp: loc.timestamp },
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
          endedAtRef.current = new Date();
          setStatus('finished');
          if (startedAtRef.current) {
            const [stats, cal] = await Promise.all([
              getHeartRateStats(startedAtRef.current, endedAtRef.current!),
              getCaloriesBurned(startedAtRef.current, endedAtRef.current!),
            ]);
            setHrStats({ avg: stats.avg, max: stats.max, calories: cal });
          }
        },
      },
    ]);
  }

  async function saveRun() {
    const distKm = totalKm(coords);
    if (distKm < 0.1) {
      Alert.alert('Corrida muito curta', 'Percorra pelo menos 100 metros para salvar.');
      return;
    }
    setSaving(true);
    try {
      const title = `Corrida de ${weekdays[startedAtRef.current!.getDay()]}`;
      const res = await api.post<{ newBestPace: boolean }>('/activities', {
        distanceKm: distKm,
        durationSeconds: elapsedSec,
        startedAt: startedAtRef.current!.toISOString(),
        title,
        ...(hrStats.avg && { avgHeartRate: hrStats.avg }),
        ...(hrStats.max && { maxHeartRate: hrStats.max }),
        ...(hrStats.calories > 0 && { caloriesBurned: hrStats.calories }),
      });
      await AsyncStorage.removeItem(COORDS_KEY);
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['activities-summary'] });
      void saveRunToHealth({
        startedAt: startedAtRef.current!,
        durationSeconds: elapsedSec,
        distanceKm: distKm,
      });
      if (res.data.newBestPace) setNewBestPace(true);
      else router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a corrida. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    Alert.alert('Descartar corrida?', 'Os dados desta corrida serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(COORDS_KEY);
          router.back();
        },
      },
    ]);
  }

  const distKm = totalKm(coords);
  const curPace = currentPaceSec(coords);
  const avgPace = avgPaceSec(distKm, elapsedSec);

  const polyline = coords.map((c) => ({ latitude: c.lat, longitude: c.lng }));
  const lastCoord = coords.length
    ? { latitude: coords[coords.length - 1].lat, longitude: coords[coords.length - 1].lng }
    : null;

  const initialRegion: Region = lastCoord
    ? { ...lastCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 }
    : currentLocation
      ? { ...currentLocation, latitudeDelta: 0.003, longitudeDelta: 0.003 }
      : { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  // ── NEW BEST PACE CELEBRATION ──
  if (newBestPace) {
    return (
      <View
        style={[s.root, s.center, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}
      >
        <Text style={s.trophyEmoji}>🏆</Text>
        <Text style={s.celebTitle}>NOVO RECORDE!</Text>
        <Text style={s.celebSub}>Você bateu seu melhor pace pessoal</Text>
        <Text style={s.celebPace}>{fmtPace(avgPace)}/km</Text>
        <Pressable style={s.btnBrand} onPress={() => router.back()}>
          <Text style={s.btnBrandText}>VER MINHAS CORRIDAS</Text>
        </Pressable>
      </View>
    );
  }

  // ── FINISHED SUMMARY ──
  if (status === 'finished') {
    return (
      <View style={[s.root, { paddingBottom: insets.bottom + 20 }]}>
        <MapView ref={mapRef} style={s.mapFull} region={initialRegion} scrollEnabled={false}>
          {polyline.length > 1 && (
            <Polyline coordinates={polyline} strokeColor={colors.brand} strokeWidth={4} />
          )}
        </MapView>

        <View style={[s.summaryPanel, { paddingBottom: insets.bottom }]}>
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
            {hrStats.max ? (
              <View style={s.summaryMetric}>
                <Text style={[s.summaryValue, { color: colors.danger }]}>{hrStats.max}</Text>
                <Text style={s.summaryUnit}>bpm</Text>
                <Text style={s.summaryLabel}>FC máxima</Text>
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

          <Pressable
            style={[s.btnBrand, { flex: 0, paddingVertical: 14 }, saving && { opacity: 0.6 }]}
            onPress={saveRun}
            disabled={saving}
          >
            <Text style={s.btnBrandText}>{saving ? 'SALVANDO...' : 'SALVAR CORRIDA'}</Text>
          </Pressable>
          <Pressable style={s.btnGhost} onPress={discard}>
            <Text style={s.btnGhostText}>Descartar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── IDLE / RUNNING / PAUSED ──
  return (
    <View style={s.root}>
      {/* Map */}
      <MapView ref={mapRef} style={s.map} region={initialRegion} showsUserLocation>
        {polyline.length > 1 && (
          <Polyline coordinates={polyline} strokeColor={colors.brand} strokeWidth={4} />
        )}
      </MapView>

      {/* Stats panel */}
      <View style={[s.panel, { paddingBottom: insets.bottom + 16 }]}>
        {/* Elapsed time */}
        <Text style={s.time}>{fmtTime(elapsedSec)}</Text>

        {/* Distance */}
        <Text style={s.distance}>
          {distKm.toFixed(2)} <Text style={s.distanceUnit}>km</Text>
        </Text>

        {/* Pace row */}
        <View style={s.paceRow}>
          <View style={s.paceCell}>
            <Text style={s.paceValue}>{fmtPace(curPace)}</Text>
            <Text style={s.paceLabel}>pace atual</Text>
          </View>
          <View style={s.paceDivider} />
          <View style={s.paceCell}>
            <Text style={s.paceValue}>{fmtPace(avgPace)}</Text>
            <Text style={s.paceLabel}>pace médio</Text>
          </View>
        </View>

        {/* Heart rate (Apple Watch) */}
        {status !== 'idle' && (
          <View style={s.hrRow}>
            <Text style={s.hrIcon}>❤️</Text>
            <Text style={[s.hrValue, heartRate ? { color: colors.danger } : null]}>
              {heartRate ? `${heartRate} bpm` : '— bpm'}
            </Text>
            {!heartRate && <Text style={s.hrHint}> (use Apple Watch)</Text>}
          </View>
        )}

        {/* Buttons */}
        {status === 'idle' && (
          <Pressable
            style={[s.btnStart, !gpsReady && { opacity: 0.5 }]}
            onPress={startRun}
            disabled={!gpsReady}
          >
            <Text style={s.btnStartText}>{gpsReady ? 'INICIAR' : 'AGUARDANDO GPS...'}</Text>
          </Pressable>
        )}

        {status === 'running' && (
          <View style={s.btnRow}>
            <Pressable style={s.btnPause} onPress={pauseRun}>
              <Text style={s.btnPauseText}>PAUSAR</Text>
            </Pressable>
            <Pressable style={s.btnStop} onPress={stopRun}>
              <Text style={s.btnStopText}>FIM</Text>
            </Pressable>
          </View>
        )}

        {status === 'paused' && (
          <View style={s.btnRow}>
            <Pressable style={s.btnResume} onPress={resumeRun}>
              <Text style={s.btnResumeText}>RETOMAR</Text>
            </Pressable>
            <Pressable style={s.btnStop} onPress={stopRun}>
              <Text style={s.btnStopText}>FIM</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  map: { flex: 1 },
  mapFull: { height: 260 },

  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  time: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 72,
    color: colors.text,
    lineHeight: 74,
    textAlign: 'center',
    letterSpacing: 2,
  },
  distance: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 48,
    color: colors.brand,
    lineHeight: 50,
    textAlign: 'center',
    letterSpacing: 1,
  },
  distanceUnit: {
    fontFamily: font.body,
    fontSize: 20,
    color: colors.textMute,
  },

  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 8,
  },
  paceCell: { flex: 1, alignItems: 'center' },
  paceDivider: { width: 1, height: 32, backgroundColor: colors.line },
  paceValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: colors.text,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  paceLabel: { fontFamily: font.body, fontSize: 10, color: colors.textMute, marginTop: 2 },

  hrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hrIcon: { fontSize: 16 },
  hrValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.textMute,
    letterSpacing: 0.5,
  },
  hrHint: { fontFamily: font.body, fontSize: 10, color: colors.textMute },

  btnStart: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnStartText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: colors.brandInk,
    letterSpacing: 2,
  },

  btnRow: { flexDirection: 'row', gap: 12 },
  btnPause: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPauseText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text, letterSpacing: 1 },
  btnResume: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnResumeText: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: colors.brandInk,
    letterSpacing: 1,
  },
  btnStop: {
    flex: 1,
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnStopText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.danger, letterSpacing: 1 },

  btnBrand: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    flex: 1,
  },
  btnBrandText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.brandInk,
    letterSpacing: 1.5,
  },
  btnGhost: { alignItems: 'center', paddingVertical: 12 },
  btnGhostText: { fontFamily: font.body, fontSize: 14, color: colors.danger },

  // Summary
  summaryPanel: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  summaryTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: colors.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  summaryMetric: { alignItems: 'center', gap: 2 },
  summaryValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: colors.text,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  summaryUnit: { fontFamily: font.body, fontSize: 13, color: colors.textMute },
  summaryLabel: { fontFamily: font.body, fontSize: 11, color: colors.textMute },

  // Celebration
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
