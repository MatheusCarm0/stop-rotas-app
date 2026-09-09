import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { api } from "../src/api";
import { requestPermissions, startTracking, stopTracking } from "../src/location";
import { getActiveShift, setActiveShift, clearSession } from "../src/session";
import { fmtKm, fmtPace, fmtTime, haversine, type Pt } from "../src/geo";
import { LiveMap } from "../src/LiveMap";
import { useTheme, type Palette } from "../src/theme";

export default function Worker() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [shiftId, setShiftId] = useState<number | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [movingTime, setMovingTime] = useState(0);
  const [moving, setMoving] = useState(false);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [busy, setBusy] = useState(false);

  const startRef = useRef<number>(0);
  const lastRef = useRef<{ p: Pt; t: number } | null>(null);
  const movingRef = useRef(0);
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
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 1 },
      (loc) => {
        const p: Pt = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        const now = Date.now();
        if (lastRef.current) {
          const d = haversine(lastRef.current.p.lat, lastRef.current.p.lng, p.lat, p.lng);
          const dt = (now - lastRef.current.t) / 1000;
          if (d < 500) setDistance((prev) => prev + d);
          const segSpeed = dt > 0 ? d / dt : 0; // m/s
          const gpsSpeed = loc.coords.speed && loc.coords.speed > 0 ? loc.coords.speed : 0;
          const spd = Math.max(segSpeed, gpsSpeed);
          if (spd > 0.3 && d > 1) {
            // andando: acumula tempo em movimento (ritmo REAL) + velocidade ao vivo
            movingRef.current += dt;
            setMovingTime(movingRef.current);
            setMoving(true);
            setLiveSpeed(spd * 3.6);
            if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
            moveTimeoutRef.current = setTimeout(() => { setMoving(false); setLiveSpeed(0); }, 8000);
          }
        }
        lastRef.current = { p, t: now };
        setPoints((prev) => (prev.length > 3000 ? [...prev.slice(1), p] : [...prev, p]));
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
        Alert.alert("Dica", "Para registrar com a tela bloqueada, autorize a localização 'o tempo todo'. Sem isso, o trajeto é registrado com o app aberto.");
      }
      const shift = await api.startShift();
      await setActiveShift(shift.id);
      setShiftId(shift.id);
      setPoints([]); setDistance(0); setMovingTime(0); setLiveSpeed(0); movingRef.current = 0; lastRef.current = null;
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
        text: "Encerrar", style: "destructive",
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
        <View style={[s.pill, { backgroundColor: c.panel, alignSelf: "flex-start" }]}>
          <View style={[s.pip, { backgroundColor: c.muted }]} />
          <Text style={[s.pillTxt, { color: c.muted }]}>Fora do expediente</Text>
        </View>
        <Text style={s.h1}>Pronto pra{"\n"}começar o dia?</Text>
        <Text style={s.p}>Ao iniciar, o app registra seu trajeto e distância automaticamente — inclusive em segundo plano.</Text>
        <TouchableOpacity style={s.btnRed} onPress={onStart} disabled={busy}>
          <Text style={s.btnRedTxt}>{busy ? "Iniciando..." : "Iniciar expediente"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={{ marginTop: 20 }}>
          <Text style={{ color: c.muted, textAlign: "center" }}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.rowBetween}>
        <View style={[s.pill, { backgroundColor: moving ? hexA(c.green, 0.15) : hexA(c.amber, 0.15) }]}>
          <View style={[s.pip, { backgroundColor: moving ? c.green : c.amber }]} />
          <Text style={[s.pillTxt, { color: moving ? c.green : c.amber }]}>{moving ? "Andando" : "Parado"}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}><Text style={{ color: c.muted }}>Sair</Text></TouchableOpacity>
      </View>

      <View style={{ marginTop: 14 }}>
        <LiveMap points={points} follow height={320} color={c.red} dark={c.mapDark} />
      </View>

      <View style={s.stats}>
        <Stat s={s} c={c} label="Distância" value={fmtKm(distance)} unit="km" accent />
        <Stat s={s} c={c} label="Tempo total" value={fmtTime(elapsed)} />
        <Stat s={s} c={c} label="Ritmo (andando)" value={fmtPace(distance, movingTime)} unit="/km" />
        <Stat s={s} c={c} label="Velocidade" value={liveSpeed.toFixed(1)} unit="km/h" />
      </View>

      <TouchableOpacity style={s.btnStop} onPress={onEnd} disabled={busy}>
        <Text style={s.btnStopTxt}>Encerrar expediente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ s, c, label, value, unit, accent }: any) {
  return (
    <View style={s.stat}>
      <Text style={s.statK}>{label}</Text>
      <Text style={[s.statV, accent && { color: c.orange }]} numberOfLines={1}>
        {value}{unit ? <Text style={s.statU}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    c: { flex: 1, backgroundColor: c.ink },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    h1: { color: c.paper, fontSize: 32, fontWeight: "900", marginTop: 16, marginBottom: 10, lineHeight: 34 },
    p: { color: c.muted, fontSize: 15, marginBottom: 24 },
    pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 6 },
    pip: { width: 8, height: 8, borderRadius: 4 },
    pillTxt: { fontWeight: "800", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
    stats: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: c.line },
    stat: { width: "50%", backgroundColor: c.panel, padding: 16, borderWidth: 0.5, borderColor: c.line },
    statK: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    statV: { color: c.paper, fontSize: 24, fontWeight: "900", marginTop: 4 },
    statU: { color: c.muted, fontSize: 14, fontWeight: "600" },
    btnRed: { backgroundColor: c.red, borderRadius: 12, padding: 16, alignItems: "center" },
    btnRedTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
    btnStop: { borderWidth: 2, borderColor: c.red, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
    btnStopTxt: { color: c.red, fontWeight: "800" },
  });
