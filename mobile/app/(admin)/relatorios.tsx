import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../src/api";
import { fmtKm } from "../../src/geo";
import { theme } from "../../src/theme";

export default function Relatorios() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [perf, setPerf] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [m, p] = await Promise.all([api.reportMonthly(6), api.reportPerformance()]);
        setMonthly(m);
        setPerf(p);
      } catch {}
    })();
  }, []);

  const maxMonthly = Math.max(1, ...monthly.map((m) => Number(m.total)));

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.sec}>Entregas por mês</Text>
      {monthly.length === 0 ? (
        <Text style={s.empty}>Sem dados ainda.</Text>
      ) : (
        <View style={s.bars}>
          {monthly.map((m) => (
            <View key={m.ym} style={s.barCol}>
              <Text style={s.barVal}>{m.total}</Text>
              <View style={[s.bar, { height: Math.max(4, (Number(m.total) / maxMonthly) * 120) }]} />
              <Text style={s.barLbl}>{String(m.ym).slice(5)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.sec}>Desempenho por funcionário (mês)</Text>
      <View style={s.table}>
        <View style={s.trow}>
          <Text style={[s.th, { flex: 2 }]}>Funcionário</Text>
          <Text style={[s.th, s.num]}>Km</Text>
          <Text style={[s.th, s.num]}>Turnos</Text>
          <Text style={[s.th, s.num]}>Entregas</Text>
        </View>
        {perf.length === 0 ? (
          <View style={s.trow}><Text style={s.td}>Sem dados ainda.</Text></View>
        ) : (
          perf.map((p) => (
            <View key={p.id} style={s.trow}>
              <Text style={[s.td, { flex: 2 }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[s.td, s.num]}>{fmtKm(Number(p.distance_m || 0))}</Text>
              <Text style={[s.td, s.num]}>{p.shifts}</Text>
              <Text style={[s.td, s.num]}>{p.deliveries}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={s.note}>Exportar em PDF/imagem para o cliente é o próximo passo. Os dados já vêm do banco (MySQL).</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.ink },
  sec: { color: theme.paper, fontSize: 15, fontWeight: "800", marginTop: 10, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { color: theme.muted },
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
  note: { color: theme.muted, fontSize: 12, marginTop: 18 },
});
