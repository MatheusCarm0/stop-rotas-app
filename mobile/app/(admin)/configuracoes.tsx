import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { clearSession, getUser, type User } from "../../src/session";
import { useTheme, type Palette } from "../../src/theme";

export default function Configuracoes() {
  const router = useRouter();
  const { colors: c, mode, setMode } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => { getUser().then(setUser); }, []);

  async function onLogout() {
    await clearSession();
    router.replace("/");
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      {/* Perfil */}
      <View style={s.card}>
        <View style={s.profileRow}>
          <View style={s.avatar}><Text style={s.avatarTxt}>{initials(user?.name || "")}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.name || "—"}</Text>
            <Text style={s.role}>{user?.role === "admin" ? "Administrador" : "Funcionário"}</Text>
          </View>
        </View>
      </View>

      {/* Aparência */}
      <Text style={s.sec}>Aparência</Text>
      <View style={s.card}>
        <View style={s.rowItem}>
          <View style={s.rowLeft}>
            <Ionicons name="moon" size={20} color={c.muted} />
            <Text style={s.itemLabel}>Tema escuro</Text>
          </View>
          <Switch
            value={mode === "dark"}
            onValueChange={(v) => setMode(v ? "dark" : "light")}
            trackColor={{ true: c.red, false: c.line }}
            thumbColor="#fff"
          />
        </View>
        <View style={s.segmentWrap}>
          {(["light", "dark"] as const).map((m) => (
            <TouchableOpacity key={m} style={[s.segment, mode === m && s.segmentOn]} onPress={() => setMode(m)}>
              <Ionicons name={m === "dark" ? "moon" : "sunny"} size={16} color={mode === m ? "#fff" : c.muted} />
              <Text style={[s.segmentTxt, mode === m && { color: "#fff" }]}>{m === "dark" ? "Escuro" : "Claro"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preferências */}
      <Text style={s.sec}>Preferências</Text>
      <View style={s.card}>
        <Row s={s} c={c} icon="notifications" label="Notificações" value="Ativadas" />
        <Row s={s} c={c} icon="locate" label="Precisão do GPS" value="Alta" last />
      </View>

      {/* Sobre */}
      <Text style={s.sec}>Sobre</Text>
      <View style={s.card}>
        <Row s={s} c={c} icon="information-circle" label="Aplicativo" value="Stop Rotas" />
        <Row s={s} c={c} icon="pricetag" label="Versão" value="0.2.0" last />
      </View>

      <TouchableOpacity style={s.logout} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color={c.red} />
        <Text style={s.logoutTxt}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={s.footer}>stop! · Aqui a parada é certa</Text>
    </ScrollView>
  );
}

function Row({ s, c, icon, label, value, last }: any) {
  return (
    <View style={[s.rowItem, last && { borderBottomWidth: 0 }]}>
      <View style={s.rowLeft}>
        <Ionicons name={icon} size={20} color={c.muted} />
        <Text style={s.itemLabel}>{label}</Text>
      </View>
      <Text style={s.itemValue}>{value}</Text>
    </View>
  );
}

function initials(n: string) {
  const p = String(n).trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    c: { flex: 1, backgroundColor: c.ink },
    card: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: "hidden" },
    profileRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.red, alignItems: "center", justifyContent: "center" },
    avatarTxt: { color: "#fff", fontWeight: "900", fontSize: 20 },
    name: { color: c.paper, fontSize: 18, fontWeight: "900" },
    role: { color: c.muted, fontSize: 13, marginTop: 2 },
    sec: { color: c.muted, fontSize: 12, fontWeight: "800", marginTop: 22, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
    rowItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.line },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    itemLabel: { color: c.paper, fontSize: 15, fontWeight: "600" },
    itemValue: { color: c.muted, fontSize: 14 },
    segmentWrap: { flexDirection: "row", gap: 8, padding: 12, paddingTop: 4 },
    segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.ink },
    segmentOn: { backgroundColor: c.red, borderColor: c.red },
    segmentTxt: { color: c.muted, fontWeight: "700" },
    logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, padding: 15, borderRadius: 12, borderWidth: 2, borderColor: c.red },
    logoutTxt: { color: c.red, fontWeight: "800", fontSize: 16 },
    footer: { color: c.muted, fontSize: 12, textAlign: "center", marginTop: 20, marginBottom: 8, fontWeight: "700" },
  });
