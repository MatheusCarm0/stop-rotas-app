import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/api";
import { clearSession } from "../src/session";
import { fmtKm, fmtPace, fmtTime } from "../src/geo";
import { theme } from "../src/theme";

export default function Admin() {
  const router = useRouter();
  const [active, setActive] = useState<any[]>([]);
  const [today, setToday] = useState<any>({ active_shifts: 0, distance_m: 0, deliveries: 0, avg_duration_s: 0 });
  const [perf, setPerf] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const [a, t, p, m] = await Promise.all([
        api.activeShifts(),
        api.reportToday(),
        api.reportPerformance(),
        api.reportMonthly(6),
      ]);
      setActive(a); setToday(t); setPerf(p); setMonthly(m);
    } catch {}
  }

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 3000); // "tempo real" por polling (socket.io disponível para push)
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  async function onLogout() {
    if (timer.current) clearInterval(timer.current);
    await clearSession();
    router.replace("/");
  }

  const maxMonthly = Math.max(1, ...monthly.map((m) => Number(m.total)));

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.rowBetween}>
        <Text style={s.h1}>Equipe em campo</Text>
        <TouchableOpacity onPress={onLogout}><Text style={{ color: theme.muted }}>Sair</Text></TouchableOpacity>
      </View>

      <View style={s.kpis}>
        <Kpi label="Ativos" value={String(today.active_shifts ?? 0)} live />
        <Kpi label="Distância hoje" value={fmtKm(Number(today.distance_m || 0))} unit="km" />
        <Kpi label="Entregas hoje" value={String(today.deliveries ?? 0)} />
        <Kpi label="Tempo médio" value={fmtTime(Number(today.avg_duration_s || 0))} />
      </View>

      <Text style={s.sec}>Funcionários ativos</Text>
      {active.length === 0 && <Text style={s.empty}>Ninguém em campo agora.</Text>}
      {active.map((sh) => (
        <View key={sh.id} style={s.emp}>
          <View style={{ flex: 1 }}>
            <View style={s.row}>
              <Text style={s.empName}>{sh.employee_name}</Text>
              <View style={[s.dot, { backgroundColor: sh.moving ? theme.green : theme.amber }]} />
              <Text style={{ color: sh.moving ? theme.green : theme.amber, fontSize: 12, fontWeight: "700" }}>
                {sh.moving ? "Andando" : "Parado"}
              </Text>
            </View>
            <Text style={s.meta}>
              {fmtKm(sh.distance_m)} km · {fmtTime(sh.duration_s)} · {sh.deliveries_count} entregas · {fmtPace(sh.distance_m, sh.duration_s)}/km
            </Text>
          </View>
        </View>
      ))}

      <Text style={s.sec}>Entregas por mês</Text>
      <View style={s.bars}>
        {monthly.map((m) => (
          <View key={m.ym} style={s.barCol}>
            <Text style={s.barVal}>{m.total}</Text>
            <View style={[s.bar, { height: Math.max(4, (Number(m.total) / maxMonthly) * 120) }]} />
            <Text style={s.barLbl}>{String(m.ym).slice(5)}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sec}>Desempenho (mês)</Text>
      <View style={s.table}>
        <View style={[s.trow, { borderBottomColor: theme.line }]}>
          <Text style={[s.th, { flex: 2 }]}>Funcionário</Text>
          <Text style={[s.th, s.num]}>Km</Text>
          <Text style={[s.th, s.num]}>Entregas</Text>
        </View>
        {perf.map((p) => (
          <View key={p.id} style={s.trow}>
            <Text style={[s.td, { flex: 2 }]}>{p.name}</Text>
            <Text style={[s.td, s.num]}>{fmtKm(Number(p.distance_m || 0))}</Text>
            <Text style={[s.td, s.num]}>{p.deliveries}</Text>
          </View>
        ))}
      </View>
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  h1: { color: theme.paper, fontSize: 26, fontWeight: "900" },
  kpis: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: theme.line },
  kpi: { width: "50%", backgroundColor: theme.panel, padding: 14, borderWidth: 0.5, borderColor: theme.line },
  kpiK: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  kpiV: { color: theme.paper, fontSize: 26, fontWeight: "900", marginTop: 4 },
  kpiU: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  sec: { color: theme.paper, fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { color: theme.muted },
  emp: { backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 14, marginBottom: 8 },
  empName: { color: theme.paper, fontWeight: "800", fontSize: 15 },
  meta: { color: theme.muted, fontSize: 13, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 170, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 12 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bar: { width: "70%", backgroundColor: theme.orange, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barVal: { color: theme.paper, fontSize: 11, fontWeight: "700" },
  barLbl: { color: theme.muted, fontSize: 11 },
  table: { backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line, borderRadius: 12, overflow: "hidden" },
  trow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line, alignItems: "center" },
  th: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  td: { color: theme.paper, fontSize: 14 },
  num: { flex: 1, textAlign: "right" },
});
