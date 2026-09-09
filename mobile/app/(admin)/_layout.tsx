import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text } from "react-native";
import { clearSession } from "../../src/session";
import { theme } from "../../src/theme";

function LogoutButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={async () => { await clearSession(); router.replace("/"); }}
      style={{ paddingHorizontal: 14 }}
    >
      <Text style={{ color: theme.muted, fontWeight: "700" }}>Sair</Text>
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.ink },
        headerTintColor: theme.paper,
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => <LogoutButton />,
        tabBarStyle: { backgroundColor: theme.ink, borderTopColor: theme.line, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: theme.red,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="monitoramento"
        options={{ title: "Monitoramento", tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{ title: "Relatórios", tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="colaboradores"
        options={{ title: "Colaboradores", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
