import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../src/api";
import { fmtKm, fmtPace, fmtTime } from "../../src/geo";
import { useTheme, type Palette } from "../../src/theme";

const PERIODS = [
  { key: 1, label: "Hoje" },
  { key: 7, label: "7 dias" },
  { key: 30, label: "30 dias" },
];

export default function Relatorios() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [su, da, rk, hi] = await Promise.all([
          api.reportSummary(days),
          api.reportDaily(Math.min(Math.max(days, 7), 30)),
          api.reportRanking(days),
          api.reportShifts(15),
        ]);
        setSummary(su); setDaily(da); setRanking(rk); setHistory(hi);
      } catch {}
    })();
  }, [days]);

  const hours = summary ? Number(summary.duration_s) / 3600 : 0;
  const speed = summary && Number(summary.duration_s) > 0
    ? (Number(summary.distance_m) / 1000) / (Number(summary.duration_s) / 3600) : 0;
  const efficiency = summary && Number(summary.duration_s) > 0
    ? Math.round((Number(summary.moving_s) / Number(summary.duration_s)) * 100) : 0;

  const maxDaily = Math.max(1, ...daily.map((d) => Number(d.distance_m)));

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      {/* filtro de período */}
      <View style={s.chips}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p.key} onPress={() => setDays(p.key)} style={[s.chip, days === p.key && s.chipOn]}>
            <Text style={[s.chipTxt, days === p.key && s.chipTxtOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs */}
      <View style={s.kpis}>
        <Kpi s={s} c={c} label="Distância total" value={fmtKm(Number(summary?.distance_m || 0))} unit="km" accent />
        <Kpi s={s} c={c} label="Horas em campo" value={hours.toFixed(1)} unit="h" />
        <Kpi s={s} c={c} label="Expedientes" value={String(summary?.shifts ?? 0)} />
        <Kpi s={s} c={c} label="Vel. média" value={speed.toFixed(1)} unit="km/h" />
        <Kpi s={s} c={c} label="Eficiência" value={String(efficiency)} unit="% andando" hint />
        <Kpi s={s} c={c} label="Colaboradores" value={String(summary?.workers ?? 0)} />
      </View>

      {/* distância por dia */}
      <Text style={s.sec}>Distância por dia (km)</Text>
      {daily.length === 0 ? (
        <Text style={s.empty}>Sem expedientes no período.</Text>
      ) : (
        <View style={s.chartBox}>
          <View style={s.bars}>
            {daily.map((d) => {
              const km = Number(d.distance_m) / 1000;
              return (
                <View key={String(d.day)} style={s.barCol}>
                  <Text style={s.barVal}>{km >= 0.1 ? km.toFixed(1) : ""}</Text>
                  <View style={[s.bar, { height: Math.max(3, (Number(d.distance_m) / maxDaily) * 120) }]} />
                  <Text style={s.barLbl}>{fmtDay(d.day)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ranking */}
      <Text style={s.sec}>Ranking de colaboradores</Text>
      <View style={s.table}>
        <View style={s.trow}>
          <Text style={[s.th, { flex: 2 }]}>Colaborador</Text>
          <Text style={[s.th, s.num]}>Km</Text>
          <Text style={[s.th, s.num]}>Horas</Text>
          <Text style={[s.th, s.num]}>Ritmo</Text>
        </View>
        {ranking.filter((r) => Number(r.shifts) > 0).length === 0 ? (
          <View style={s.trow}><Text style={s.td}>Sem dados no período.</Text></View>
        ) : (
          ranking.filter((r) => Number(r.shifts) > 0).map((r, i) => (
            <View key={r.id} style={s.trow}>
              <Text style={[s.td, { flex: 2 }]} numberOfLines={1}>
                <Text style={{ color: c.orange, fontWeight: "800" }}>{i + 1}º </Text>{r.name}
              </Text>
              <Text style={[s.td, s.num]}>{fmtKm(Number(r.distance_m))}</Text>
              <Text style={[s.td, s.num]}>{(Number(r.duration_s) / 3600).toFixed(1)}</Text>
              <Text style={[s.td, s.num]}>{fmtPace(Number(r.distance_m), Number(r.moving_s) || Number(r.duration_s))}</Text>
            </View>
          ))
        )}
      </View>

      {/* histórico */}
      <Text style={s.sec}>Últimos expedientes</Text>
      <View style={s.table}>
        {history.length === 0 ? (
          <View style={s.trow}><Text style={s.td}>Nenhum expediente ainda.</Text></View>
        ) : (
          history.map((h) => (
            <View key={h.id} style={s.hrow}>
              <View style={{ flex: 1 }}>
                <Text style={s.hName}>{h.employee_name}</Text>
                <Text style={s.hMeta}>{fmtDateTime(h.started_at)} · {fmtTime(Number(h.duration_s))}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.hKm}>{fmtKm(Number(h.distance_m))} km</Text>
                <View style={[s.badge, { backgroundColor: h.status === "active" ? hexA(c.green, 0.15) : c.panel2 }]}>
                  <Text style={{ color: h.status === "active" ? c.green : c.muted, fontSize: 10, fontWeight: "800" }}>
                    {h.status === "active" ? "EM ANDAMENTO" : "ENCERRADO"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={s.note}>Dados vindos direto do MySQL. Exportar em PDF para o cliente é o próximo passo.</Text>
    </ScrollView>
  );
}

function Kpi({ s, c, label, value, unit, accent, hint }: any) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiK}>{label}</Text>
      <Text style={[s.kpiV, accent && { color: c.orange }, hint && { color: c.green }]} numberOfLines={1}>
        {value}{unit ? <Text style={s.kpiU}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function fmtDay(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function fmtDateTime(d: string) {
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    c: { flex: 1, backgroundColor: c.ink },
    chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.panel },
    chipOn: { backgroundColor: c.red, borderColor: c.red },
    chipTxt: { color: c.muted, fontWeight: "700", fontSize: 13 },
    chipTxtOn: { color: "#fff" },
    kpis: { flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: c.line },
    kpi: { width: "33.33%", backgroundColor: c.panel, padding: 12, borderWidth: 0.5, borderColor: c.line, minHeight: 78 },
    kpiK: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    kpiV: { color: c.paper, fontSize: 20, fontWeight: "900", marginTop: 6 },
    kpiU: { color: c.muted, fontSize: 11, fontWeight: "600" },
    sec: { color: c.paper, fontSize: 15, fontWeight: "800", marginTop: 22, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    empty: { color: c.muted },
    chartBox: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12 },
    bars: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 170 },
    barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 5 },
    bar: { width: "62%", backgroundColor: c.orange, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    barVal: { color: c.paper, fontSize: 9, fontWeight: "700" },
    barLbl: { color: c.muted, fontSize: 9 },
    table: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: "hidden" },
    trow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line, alignItems: "center" },
    th: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    td: { color: c.paper, fontSize: 14 },
    num: { flex: 1, textAlign: "right" },
    hrow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line, alignItems: "center" },
    hName: { color: c.paper, fontWeight: "700", fontSize: 14 },
    hMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
    hKm: { color: c.paper, fontWeight: "800", fontSize: 14 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
    note: { color: c.muted, fontSize: 12, marginTop: 18, marginBottom: 8 },
  });
