import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { api } from "../src/api";
import { requestPermissions, startTracking, stopTracking } from "../src/location";
import { getActiveShift, setActiveShift, clearSession } from "../src/session";
import { fmtKm, fmtPace, fmtTime, haversine, type Pt } from "../src/geo";
import { RouteMap } from "../src/RouteMap";
import { theme } from "../src/theme";

export default function Worker() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [deliveries, setDeliveries] = useState(0);
  const [moving, setMoving] = useState(true);
  const [busy, setBusy] = useState(false);

  const startRef = useRef<number>(0);
  const lastRef = useRef<Pt | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }

  async function beginForeground() {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    }
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
      (loc) => {
        const p: Pt = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        const spd = loc.coords.speed ?? 0;
        setMoving(spd > 0.6);
        if (lastRef.current) {
          const d = haversine(lastRef.current.lat, lastRef.current.lng, p.lat, p.lng);
          if (d < 500) setDistance((prev) => prev + d);
        }
        lastRef.current = p;
        setPoints((prev) => (prev.length > 1500 ? [...prev.slice(1), p] : [...prev, p]));
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
      setDeliveries(0);
      startRef.current = Date.now();
      await startTracking();
      await beginForeground();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível iniciar");
    } finally {
      setBusy(false);
    }
  }

  async function onDelivery() {
    if (!shiftId) return;
    const last = lastRef.current;
    setDeliveries((d) => d + 1); // otimista
    try {
      await api.addDelivery(shiftId, { lat: last?.lat ?? null, lng: last?.lng ?? null });
    } catch {
      setDeliveries((d) => Math.max(0, d - 1));
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

  const mapW = width - 32;

  if (!shiftId) {
    return (
      <View style={[s.c, { padding: 24, justifyContent: "center" }]}>
        <View style={[s.pill, { backgroundColor: theme.panel, alignSelf: "flex-start" }]}>
          <View style={[s.pip, { backgroundColor: theme.muted }]} />
          <Text style={[s.pillTxt, { color: theme.muted }]}>Fora do expediente</Text>
        </View>
        <Text style={s.h1}>Pronto pra{"\n"}começar o dia?</Text>
        <Text style={s.p}>Ao iniciar, o app registra seu trajeto, distância e paradas automaticamente — inclusive em segundo plano.</Text>
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
        <RouteMap points={points} width={mapW} height={220} color={theme.red} />
      </View>

      <View style={s.stats}>
        <Stat label="Distância" value={fmtKm(distance)} unit="km" accent />
        <Stat label="Tempo" value={fmtTime(elapsed)} />
        <Stat label="Ritmo médio" value={fmtPace(distance, elapsed)} unit="/km" />
        <Stat label="Entregas" value={String(deliveries)} />
      </View>

      <TouchableOpacity style={s.btnGhost} onPress={onDelivery}>
        <Text style={s.btnGhostTxt}>+ Registrar entrega</Text>
      </TouchableOpacity>
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
      <Text style={[s.statV, accent && { color: theme.orange }]}>
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
  statV: { color: theme.paper, fontSize: 30, fontWeight: "900", marginTop: 4 },
  statU: { color: theme.muted, fontSize: 14, fontWeight: "600" },
  btnRed: { backgroundColor: theme.red, borderRadius: 12, padding: 16, alignItems: "center" },
  btnRedTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnGhost: { borderWidth: 2, borderColor: theme.line, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  btnGhostTxt: { color: theme.paper, fontWeight: "800" },
  btnStop: { borderWidth: 2, borderColor: theme.red, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 10 },
  btnStopTxt: { color: theme.red, fontWeight: "800" },
});
