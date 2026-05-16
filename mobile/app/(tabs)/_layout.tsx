import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import {
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type TabNavigationState,
} from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';

import { FloatingTabBar } from '../../src/components/FloatingTabBar';
import { isFullscreenRoute } from '../../src/lib/navRoutes';
import { colors } from '../../src/lib/tokens';

const { Navigator } = createMaterialTopTabNavigator();

// withLayoutContext liga o navigator do React Navigation ao roteamento
// file-based do expo-router. Pager nativo = swipe horizontal entre abas.
const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: 'Home' }} />
      <MaterialTopTabs.Screen name="ranking" options={{ title: 'Ranking' }} />
      <MaterialTopTabs.Screen name="feed" options={{ title: 'Feed' }} />
      <MaterialTopTabs.Screen
        name="runs"
        options={({ route }) => {
          // Dentro do stack de runs, desliga o swipe nas telas full-screen
          // (tracker/detalhe/gráficos) pra não brigar com mapa e scrolls.
          const nested = getFocusedRouteNameFromRoute(route) ?? 'index';
          return { title: 'Corridas', swipeEnabled: !isFullscreenRoute(nested) };
        }}
      />
      <MaterialTopTabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </MaterialTopTabs>
  );
}
