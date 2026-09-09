import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { api } from "../src/api";
import { requestPermissions, startTracking, stopTracking } from "../src/location";
import { getActiveShift, setActiveShift, clearSession } from "../src/session";
import { fmtKm, fmtPace, fmtTime, haversine, type Pt } from "../src/geo";
import { LiveMap } from "../src/LiveMap";
import { theme } from "../src/theme";

export default function Worker() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);

  const startRef = useRef<number>(0);
  const lastRef = useRef<{ p: Pt; t: number } | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getActiveShift();
      if (existing) {
        setShiftId(existing);
        startRef.current = Date.now();
        beginForeground();
      }
    })();
    return () => cleanup();
  }, []);

  function cleanup() {
    watchRef.current?.remove();
    watchRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
  }

  async function beginForeground() {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    }
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 8 },
      (loc) => {
        const p: Pt = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        const now = Date.now();
        if (lastRef.current) {
          const d = haversine(lastRef.current.p.lat, lastRef.current.p.lng, p.lat, p.lng);
          const dt = (now - lastRef.current.t) / 1000;
          if (d < 500) setDistance((prev) => prev + d);
          // andando se deslocou de forma consistente
          if (dt > 0 && d / dt > 0.4) {
            setMoving(true);
            if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
            moveTimeoutRef.current = setTimeout(() => setMoving(false), 12000); // sem update em 12s = parado
          }
        }
        lastRef.current = { p, t: now };
        setPoints((prev) => (prev.length > 2000 ? [...prev.slice(1), p] : [...prev, p]));
      }
    );
  }

  async function onStart() {
    setBusy(true);
    try {
      const perm = await requestPermissions();
      if (!perm.ok) {
        Alert.alert("Permissão necessária", "Autorize o acesso à localização para iniciar o expediente.");
        return;
      }
      if (!perm.background) {
        Alert.alert(
          "Dica",
          "Para registrar com a tela bloqueada, autorize a localização 'o tempo todo' nas configurações. Sem isso, o trajeto é registrado com o app aberto."
        );
      }
      const shift = await api.startShift();
      await setActiveShift(shift.id);
      setShiftId(shift.id);
      setPoints([]);
      setDistance(0);
      lastRef.current = null;
      startRef.current = Date.now();
      await startTracking();
      await beginForeground();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível iniciar");
    } finally {
      setBusy(false);
    }
  }

  async function onEnd() {
    if (!shiftId) return;
    Alert.alert("Encerrar expediente", "Deseja finalizar e gerar o comprovante?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Encerrar",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            cleanup();
            await stopTracking();
            const id = shiftId;
            await api.endShift(id);
            await setActiveShift(null);
            setShiftId(null);
            router.replace({ pathname: "/summary", params: { shiftId: String(id) } });
          } catch (e: any) {
            Alert.alert("Erro", e.message || "Falha ao encerrar");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function onLogout() {
    cleanup();
    await stopTracking();
    await clearSession();
    router.replace("/");
  }

  if (!shiftId) {
    return (
      <View style={[s.c, { padding: 24, justifyContent: "center" }]}>
        <View style={[s.pill, { backgroundColor: theme.panel, alignSelf: "flex-start" }]}>
          <View style={[s.pip, { backgroundColor: theme.muted }]} />
          <Text style={[s.pillTxt, { color: theme.muted }]}>Fora do expediente</Text>
        </View>
        <Text style={s.h1}>Pronto pra{"\n"}começar o dia?</Text>
        <Text style={s.p}>Ao iniciar, o app registra seu trajeto e distância automaticamente — inclusive em segundo plano.</Text>
        <TouchableOpacity style={s.btnRed} onPress={onStart} disabled={busy}>
          <Text style={s.btnRedTxt}>{busy ? "Iniciando..." : "Iniciar expediente"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.muted, textAlign: "center" }}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.rowBetween}>
        <View style={[s.pill, { backgroundColor: moving ? "rgba(52,209,127,0.15)" : "rgba(255,176,32,0.15)" }]}>
          <View style={[s.pip, { backgroundColor: moving ? theme.green : theme.amber }]} />
          <Text style={[s.pillTxt, { color: moving ? theme.green : theme.amber }]}>{moving ? "Andando" : "Parado"}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}><Text style={{ color: theme.muted }}>Sair</Text></TouchableOpacity>
      </View>

      <View style={{ marginTop: 14 }}>
        <LiveMap points={points} follow height={320} color={theme.red} />
      </View>

      <View style={s.stats}>
        <Stat label="Distância" value={fmtKm(distance)} unit="km" accent />
        <Stat label="Tempo" value={fmtTime(elapsed)} />
        <Stat label="Ritmo médio" value={fmtPace(distance, elapsed)} unit="/km" />
        <Stat label="Velocidade" value={moving ? "em movimento" : "parado"} />
      </View>

      <TouchableOpacity style={s.btnStop} onPress={onEnd} disabled={busy}>
        <Text style={s.btnStopTxt}>Encerrar expediente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={s.statK}>{label}</Text>
      <Text style={[s.statV, accent && { color: theme.orange }]} numberOfLines={1}>
        {value}
        {unit ? <Text style={s.statU}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.ink },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h1: { color: theme.paper, fontSize: 32, fontWeight: "900", marginTop: 16, marginBottom: 10, lineHeight: 34 },
  p: { color: theme.muted, fontSize: 15, marginBottom: 24 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 6 },
  pip: { width: 8, height: 8, borderRadius: 4 },
  pillTxt: { fontWeight: "800", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  stats: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: theme.line },
  stat: { width: "50%", backgroundColor: theme.panel, padding: 16, borderWidth: 0.5, borderColor: theme.line },
  statK: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  statV: { color: theme.paper, fontSize: 26, fontWeight: "900", marginTop: 4 },
  statU: { color: theme.muted, fontSize: 14, fontWeight: "600" },
  btnRed: { backgroundColor: theme.red, borderRadius: 12, padding: 16, alignItems: "center" },
  btnRedTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnStop: { borderWidth: 2, borderColor: theme.red, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  btnStopTxt: { color: theme.red, fontWeight: "800" },
});
