import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register-email" />
      <Stack.Screen name="register-phone" />
      <Stack.Screen name="otp-verify" />
    </Stack>
  );
}