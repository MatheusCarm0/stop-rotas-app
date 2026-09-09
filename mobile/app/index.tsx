import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/api";
import { getToken, getUser } from "../src/session";
import { useTheme, type Palette } from "../src/theme";

export default function Login() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const user = await getUser();
      if (token && user) router.replace(user.role === "admin" ? "/monitoramento" : "/worker");
      else setChecking(false);
    })();
  }, []);

  async function onLogin() {
    setError(null);
    setLoading(true);
    try {
      const { user } = await api.login(username.trim(), password);
      router.replace(user.role === "admin" ? "/monitoramento" : "/worker");
    } catch (e: any) {
      setError(e.message || "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={c.red} />
      </View>
    );
  }

  return (
    <View style={[s.container, { padding: 24, justifyContent: "center" }]}>
      <Text style={s.brand}>
        stop<Text style={{ color: c.red }}>p!</Text>
      </Text>
      <Text style={s.app}>STOP ROTAS · GESTÃO EM CAMPO</Text>
      <Text style={s.h1}>Bom dia,{"\n"}bora pra rua?</Text>

      <Text style={s.label}>Usuário</Text>
      <TextInput style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="ex.: bruno" placeholderTextColor={c.muted} />
      <Text style={s.label}>Senha</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" placeholderTextColor={c.muted} />

      {error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={s.btn} onPress={onLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Entrar e iniciar expediente</Text>}
      </TouchableOpacity>

      <Text style={s.hint}>Demo: admin / admin123 · bruno / senha123</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.ink },
    center: { alignItems: "center", justifyContent: "center" },
    brand: { color: c.paper, fontSize: 40, fontWeight: "900" },
    app: { color: c.muted, fontSize: 12, letterSpacing: 2, marginTop: 4, fontWeight: "700" },
    h1: { color: c.paper, fontSize: 34, fontWeight: "900", marginTop: 24, marginBottom: 24, lineHeight: 36 },
    label: { color: c.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, color: c.paper, borderRadius: 10, padding: 14, fontSize: 16 },
    btn: { backgroundColor: c.red, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 24 },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
    error: { color: c.amber, marginTop: 12 },
    hint: { color: c.muted, fontSize: 12, textAlign: "center", marginTop: 20 },
  });
