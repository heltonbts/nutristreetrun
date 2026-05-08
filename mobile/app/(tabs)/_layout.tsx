import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors, font } from '../../src/lib/tokens';
import { TabIcon } from '../../src/components/TabIcon';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,10,0.95)',
          borderTopColor: colors.line,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMute,
        tabBarLabelStyle: {
          fontFamily: font.bodyBold,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking', tabBarIcon: ({ color }) => <TabIcon name="ranking" color={color} /> }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ({ color }) => <TabIcon name="feed" color={color} /> }} />
      <Tabs.Screen name="runs" options={{ title: 'Corridas', tabBarIcon: ({ color }) => <TabIcon name="runs" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} /> }} />
    </Tabs>
  );
}
