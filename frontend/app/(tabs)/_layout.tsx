import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';

export default function TabsLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const canAccessCRM = user?.role === 'admin' || user?.role === 'project_manager' || user?.role === 'crm_manager' || user?.role === 'crm_user' || user?.role === 'marketing_head';
  const canAccessProjects = user?.role !== 'vendor';
  const isWorker = user?.role === 'worker';

  // Calculate proper bottom padding for Android navigation bar
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 10) : 8;
  const tabBarHeight = 60 + (Platform.OS === 'android' ? insets.bottom : 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      {canAccessProjects && (
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Projects',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business" size={size} color={color} />
            ),
          }}
        />
      )}
      {!isWorker && (
        <Tabs.Screen
          name="materials"
          options={{
            title: 'Materials',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="layers" size={size} color={color} />
            ),
          }}
        />
      )}
      {canAccessCRM && (
        <Tabs.Screen
          name="crm"
          options={{
            title: 'CRM',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
      )}
      {(canAccessProjects || user?.role === 'admin') && (
        <Tabs.Screen
          name="labor"
          options={{
            title: 'Labor',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-circle" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}