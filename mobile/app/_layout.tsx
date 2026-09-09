import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "../src/theme";
// Importa para registrar a task de localização em background.
import "../src/location";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.ink },
          headerTintColor: theme.paper,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: theme.ink },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Stop Rotas", headerShown: false }} />
        <Stack.Screen name="worker" options={{ title: "Expediente" }} />
        <Stack.Screen name="summary" options={{ title: "Comprovante" }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
