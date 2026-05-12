import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../lib/api';
import { initHealthKit, requestHealthKitPermissions } from '../lib/healthKit';
import { colors, font } from '../lib/tokens';

interface Props {
  strava: { connected: boolean; stravaId: number | null };
  onClose: () => void;
}

interface AppConnection {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

const APPS: AppConnection[] = [
  {
    id: 'strava',
    name: 'Strava',
    description: 'Importa corridas automaticamente',
    available: true,
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'Sincroniza FC, calorias e corridas',
    available: true,
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    description: 'Disponível na versão completa',
    available: false,
  },
];

function StravaIcon() {
  return (
    <View style={[s.appIcon, { backgroundColor: '#FC4C02' }]}>
      <Text style={s.appIconText}>S</Text>
    </View>
  );
}

function AppleIcon() {
  return (
    <View style={[s.appIcon, { backgroundColor: '#fff' }]}>
      <Text style={[s.appIconText, { color: '#000' }]}>🍎</Text>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={[s.appIcon, { backgroundColor: '#4285F4' }]}>
      <Text style={s.appIconText}>G</Text>
    </View>
  );
}

const ICONS: Record<string, () => React.JSX.Element> = {
  strava: StravaIcon,
  apple_health: AppleIcon,
  google_fit: GoogleIcon,
};

export function ConnectionsScreen({ strava, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const waitingCallback = useRef(false);

  useEffect(() => {
    initHealthKit().then((ok) => setAppleHealthConnected(ok));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && waitingCallback.current) {
        waitingCallback.current = false;
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  async function connectStrava() {
    setLoadingId('strava-connect');
    try {
      const res = await api.get<{ url: string }>('/auth/strava/url');
      waitingCallback.current = true;
      await Linking.openURL(res.data.url);
    } catch {
      waitingCallback.current = false;
      Alert.alert('Erro', 'Não foi possível abrir a autorização do Strava.');
    } finally {
      setLoadingId(null);
    }
  }

  async function connectAppleHealth() {
    setLoadingId('apple_health');
    try {
      const ok = await requestHealthKitPermissions();
      setAppleHealthConnected(ok);
      if (!ok)
        Alert.alert('Permissão negada', 'Autorize o acesso ao Apple Health nas configurações.');
    } finally {
      setLoadingId(null);
    }
  }

  async function syncStrava() {
    setLoadingId('strava-sync');
    try {
      const res = await api.post<{ synced: number }>('/auth/strava/sync');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('Sincronizado', `${res.data.synced} atividade(s) importada(s).`);
    } catch {
      Alert.alert('Erro', 'Falha ao sincronizar com o Strava.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={onClose}>
          <Text style={s.cancel}>Fechar</Text>
        </Pressable>
        <Text style={s.title}>CONEXÕES</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={s.body}>
        <Text style={s.hint}>
          Conecte seus apps de corrida para importar atividades automaticamente.
        </Text>

        {APPS.map((app) => {
          const Icon = ICONS[app.id];
          const isStrava = app.id === 'strava';
          const isApple = app.id === 'apple_health';
          const connected = isStrava ? strava.connected : isApple ? appleHealthConnected : false;

          return (
            <View key={app.id} style={s.appRow}>
              <Icon />
              <View style={s.appInfo}>
                <Text style={s.appName}>{app.name}</Text>
                <Text style={s.appDesc}>{app.description}</Text>
              </View>

              {!app.available ? (
                <View style={s.pillSoon}>
                  <Text style={s.pillSoonText}>EM BREVE</Text>
                </View>
              ) : connected ? (
                <View style={s.connectedCol}>
                  <View style={s.pillConnected}>
                    <View style={s.dot} />
                    <Text style={s.pillConnectedText}>Conectado</Text>
                  </View>
                  {isStrava && (
                    <Pressable style={s.syncBtn} onPress={syncStrava} disabled={loadingId !== null}>
                      {loadingId === 'strava-sync' ? (
                        <ActivityIndicator size={11} color={colors.brandInk} />
                      ) : (
                        <Text style={s.syncBtnText}>SINCRONIZAR</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  style={s.connectBtn}
                  onPress={isApple ? connectAppleHealth : connectStrava}
                  disabled={loadingId !== null}
                >
                  {loadingId === (isApple ? 'apple_health' : 'strava-connect') ? (
                    <ActivityIndicator size={13} color={colors.brand} />
                  ) : (
                    <Text style={s.connectBtnText}>CONECTAR</Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.5,
  },
  cancel: { fontFamily: font.body, fontSize: 15, color: colors.textMute, width: 48 },

  body: { padding: 20, gap: 12 },
  hint: { fontFamily: font.body, fontSize: 13, color: colors.textMute, marginBottom: 8 },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  appIconText: { fontFamily: font.bodyBold, fontSize: 18, color: '#fff' },
  appInfo: { flex: 1, gap: 3 },
  appName: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },
  appDesc: { fontFamily: font.body, fontSize: 12, color: colors.textMute },

  connectedCol: { alignItems: 'flex-end', gap: 6 },
  pillConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(61,220,132,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  pillConnectedText: { fontFamily: font.bodyBold, fontSize: 10, color: colors.success },

  syncBtn: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  syncBtnText: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.brandInk,
    letterSpacing: 0.8,
  },

  connectBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  connectBtnText: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 0.8,
  },

  pillSoon: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillSoonText: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.8,
  },
});
