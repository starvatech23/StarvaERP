import { Stack } from 'expo-router';

export default function CRMLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-lead" />
    </Stack>
  );
}
