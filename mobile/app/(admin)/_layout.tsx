import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";

export default function AdminLayout() {
  const { colors: c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.ink },
        headerTintColor: c.paper,
        headerTitleStyle: { fontWeight: "800" },
        tabBarStyle: { backgroundColor: c.ink, borderTopColor: c.line, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: c.red,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="monitoramento" options={{ title: "Monitoramento", tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color} size={size} /> }} />
      <Tabs.Screen name="relatorios" options={{ title: "Relatórios", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }} />
      <Tabs.Screen name="colaboradores" options={{ title: "Equipe", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
      <Tabs.Screen name="configuracoes" options={{ title: "Ajustes", tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" color={color} size={size} /> }} />
    </Tabs>
  );
}
