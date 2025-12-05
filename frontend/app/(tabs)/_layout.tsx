import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const { user } = useAuth();

  const canAccessCRM = user?.role === 'admin' || user?.role === 'project_manager';
  const canAccessProjects = user?.role !== 'vendor';
  const isWorker = user?.role === 'worker';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#718096',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
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