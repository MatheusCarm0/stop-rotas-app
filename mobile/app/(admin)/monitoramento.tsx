import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../src/api";
import { fmtKm, fmtPace, fmtTime } from "../../src/geo";
import { LiveMap, type MapMarker } from "../../src/LiveMap";
import { theme } from "../../src/theme";

function isMoving(sh: any) {
  return !!sh.moving && Number(sh.since_seen ?? 0) < 25;
}

export default function Monitoramento() {
  const [active, setActive] = useState<any[]>([]);
  const [today, setToday] = useState<any>({ active_shifts: 0, distance_m: 0, deliveries: 0, avg_duration_s: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const [a, t] = await Promise.all([api.activeShifts(), api.reportToday()]);
      setActive(a);
      setToday(t);
    } catch {}
  }

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const markers: MapMarker[] = active
    .filter((sh) => sh.last_lat != null && sh.last_lng != null)
    .map((sh) => ({
      lat: sh.last_lat,
      lng: sh.last_lng,
      label: sh.employee_name,
      color: isMoving(sh) ? theme.green : theme.amber,
    }));

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.kpis}>
        <Kpi label="Ativos" value={String(today.active_shifts ?? 0)} live />
        <Kpi label="Distância hoje" value={fmtKm(Number(today.distance_m || 0))} unit="km" />
        <Kpi label="Entregas hoje" value={String(today.deliveries ?? 0)} />
        <Kpi label="Tempo médio" value={fmtTime(Number(today.avg_duration_s || 0))} />
      </View>

      <Text style={s.sec}>Mapa ao vivo</Text>
      <LiveMap markers={markers} height={300} />

      <Text style={s.sec}>Funcionários em campo</Text>
      {active.length === 0 && <Text style={s.empty}>Ninguém em campo agora.</Text>}
      {active.map((sh) => {
        const mv = isMoving(sh);
        return (
          <View key={sh.id} style={s.emp}>
            <View style={s.row}>
              <Text style={s.empName}>{sh.employee_name}</Text>
              <View style={[s.dot, { backgroundColor: mv ? theme.green : theme.amber }]} />
              <Text style={{ color: mv ? theme.green : theme.amber, fontSize: 12, fontWeight: "700" }}>
                {mv ? "Andando" : "Parado"}
              </Text>
            </View>
            <Text style={s.meta}>
              {fmtKm(sh.distance_m)} km · {fmtTime(sh.duration_s)} · {fmtPace(sh.distance_m, sh.duration_s)}/km
              {sh.since_seen != null ? `  ·  visto há ${Math.round(Number(sh.since_seen))}s` : ""}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Kpi({ label, value, unit, live }: { label: string; value: string; unit?: string; live?: boolean }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiK}>{label}</Text>
      <Text style={[s.kpiV, live && { color: theme.green }]}>
        {value}{unit ? <Text style={s.kpiU}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  kpis: { flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: theme.line },
  kpi: { width: "50%", backgroundColor: theme.panel, padding: 14, borderWidth: 0.5, borderColor: theme.line },
  kpiK: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  kpiV: { color: theme.paper, fontSize: 24, fontWeight: "900", marginTop: 4 },
  kpiU: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  sec: { color: theme.paper, fontSize: 15, fontWeight: "800", marginTop: 22, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { color: theme.muted },
  emp: { backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 14, marginBottom: 8 },
  empName: { color: theme.paper, fontWeight: "800", fontSize: 15 },
  meta: { color: theme.muted, fontSize: 13, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
