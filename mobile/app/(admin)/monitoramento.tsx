import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../src/api";
import { fmtKm, fmtPace, fmtTime } from "../../src/geo";
import { LiveMap, type MapMarker } from "../../src/LiveMap";
import { useTheme, type Palette } from "../../src/theme";

function isMoving(sh: any) {
  return !!sh.moving && Number(sh.since_seen ?? 0) < 25;
}
function paceReal(sh: any) {
  const t = Number(sh.moving_s) > 0 ? Number(sh.moving_s) : Number(sh.duration_s);
  return fmtPace(Number(sh.distance_m), t);
}

export default function Monitoramento() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [active, setActive] = useState<any[]>([]);
  const [today, setToday] = useState<any>({ active_shifts: 0, distance_m: 0, deliveries: 0, avg_duration_s: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const [a, t] = await Promise.all([api.activeShifts(), api.reportToday()]);
      setActive(a); setToday(t);
    } catch {}
  }

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const markers: MapMarker[] = active
    .filter((sh) => sh.last_lat != null && sh.last_lng != null)
    .map((sh) => ({ lat: sh.last_lat, lng: sh.last_lng, label: sh.employee_name, color: isMoving(sh) ? c.green : c.amber }));

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.kpis}>
        <Kpi s={s} c={c} label="Ativos" value={String(today.active_shifts ?? 0)} live />
        <Kpi s={s} c={c} label="Distância hoje" value={fmtKm(Number(today.distance_m || 0))} unit="km" />
        <Kpi s={s} c={c} label="Tempo médio" value={fmtTime(Number(today.avg_duration_s || 0))} />
        <Kpi s={s} c={c} label="Em campo agora" value={String(active.length)} />
      </View>

      <Text style={s.sec}>Mapa ao vivo</Text>
      <LiveMap markers={markers} height={300} dark={c.mapDark} />

      <Text style={s.sec}>Funcionários em campo</Text>
      {active.length === 0 && <Text style={s.empty}>Ninguém em campo agora.</Text>}
      {active.map((sh) => {
        const mv = isMoving(sh);
        return (
          <View key={sh.id} style={s.emp}>
            <View style={s.row}>
              <Text style={s.empName}>{sh.employee_name}</Text>
              <View style={[s.dot, { backgroundColor: mv ? c.green : c.amber }]} />
              <Text style={{ color: mv ? c.green : c.amber, fontSize: 12, fontWeight: "700" }}>{mv ? "Andando" : "Parado"}</Text>
            </View>
            <Text style={s.meta}>
              {fmtKm(sh.distance_m)} km · {fmtTime(sh.duration_s)} · {paceReal(sh)}/km
              {sh.since_seen != null ? `  ·  visto há ${Math.round(Number(sh.since_seen))}s` : ""}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Kpi({ s, c, label, value, unit, live }: any) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiK}>{label}</Text>
      <Text style={[s.kpiV, live && { color: c.green }]}>
        {value}{unit ? <Text style={s.kpiU}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    c: { flex: 1, backgroundColor: c.ink },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    kpis: { flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: c.line },
    kpi: { width: "50%", backgroundColor: c.panel, padding: 14, borderWidth: 0.5, borderColor: c.line },
    kpiK: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    kpiV: { color: c.paper, fontSize: 24, fontWeight: "900", marginTop: 4 },
    kpiU: { color: c.muted, fontSize: 13, fontWeight: "600" },
    sec: { color: c.paper, fontSize: 15, fontWeight: "800", marginTop: 22, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    empty: { color: c.muted },
    emp: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 14, marginBottom: 8 },
    empName: { color: c.paper, fontWeight: "800", fontSize: 15 },
    meta: { color: c.muted, fontSize: 13, marginTop: 4 },
    dot: { width: 8, height: 8, borderRadius: 4 },
  });
