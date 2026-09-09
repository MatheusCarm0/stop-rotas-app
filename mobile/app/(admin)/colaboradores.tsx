import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../../src/api";
import { useTheme, type Palette } from "../../src/theme";

export default function Colaboradores() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setList(await api.listEmployees()); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function onCreate() {
    if (name.trim().length < 2 || username.trim().length < 3 || password.length < 4) {
      Alert.alert("Dados incompletos", "Preencha nome, usuário (3+) e senha (4+).");
      return;
    }
    setSaving(true);
    try {
      await api.createEmployee({ name: name.trim(), username: username.trim().toLowerCase(), password, role: "worker" });
      setName(""); setUsername(""); setPassword("");
      Alert.alert("Pronto", "Colaborador cadastrado.");
      load();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível cadastrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.h}>Novo colaborador</Text>
        <Field s={s} c={c} label="Nome completo" value={name} onChangeText={setName} placeholder="Ex.: João da Silva" />
        <Field s={s} c={c} label="Usuário (login)" value={username} onChangeText={setUsername} placeholder="ex.: joao" autoCapitalize="none" />
        <Field s={s} c={c} label="Senha" value={password} onChangeText={setPassword} placeholder="mínimo 4 caracteres" secureTextEntry />
        <TouchableOpacity style={s.btn} onPress={onCreate} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Cadastrar colaborador</Text>}
        </TouchableOpacity>
      </View>

      <Text style={s.sec}>Equipe cadastrada ({list.length})</Text>
      {list.map((e) => (
        <View key={e.id} style={s.emp}>
          <View style={s.avatar}><Text style={s.avatarTxt}>{initials(e.name)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.empName}>{e.name}</Text>
            <Text style={s.meta}>@{e.username} · {e.role === "admin" ? "Administrador" : "Funcionário"}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: e.active ? hexA(c.green, 0.15) : c.panel2 }]}>
            <Text style={{ color: e.active ? c.green : c.muted, fontSize: 11, fontWeight: "800" }}>{e.active ? "ATIVO" : "INATIVO"}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function initials(n: string) {
  const p = String(n).trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
function Field({ s, c, label, ...rest }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={c.muted} {...rest} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    c: { flex: 1, backgroundColor: c.ink },
    card: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 16 },
    h: { color: c.paper, fontSize: 18, fontWeight: "900", marginBottom: 12 },
    label: { color: c.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
    input: { backgroundColor: c.ink, borderWidth: 1, borderColor: c.line, color: c.paper, borderRadius: 10, padding: 13, fontSize: 16 },
    btn: { backgroundColor: c.red, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 4 },
    btnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
    sec: { color: c.paper, fontSize: 15, fontWeight: "800", marginTop: 24, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    emp: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, marginBottom: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.red, alignItems: "center", justifyContent: "center" },
    avatarTxt: { color: "#fff", fontWeight: "900" },
    empName: { color: c.paper, fontWeight: "800", fontSize: 15 },
    meta: { color: c.muted, fontSize: 13, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  });
