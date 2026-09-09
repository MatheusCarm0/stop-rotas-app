import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../src/api";
import { fmtKm, fmtPace, fmtTime, type Pt } from "../src/geo";
import { RouteMap } from "../src/RouteMap";
import { theme } from "../src/theme";

export default function Summary() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.getShift(Number(shiftId)));
      } finally {
        setLoading(false);
      }
    })();
  }, [shiftId]);

  if (loading) return <View style={[s.c, s.center]}><ActivityIndicator color={theme.red} /></View>;
  if (!data) return <View style={[s.c, s.center]}><Text style={{ color: theme.muted }}>Turno não encontrado.</Text></View>;

  const shift = data.shift;
  const points: Pt[] = (data.points || []).map((p: any) => ({ lat: p.lat, lng: p.lng }));
  const deliv: Pt[] = (data.deliveries || []).filter((d: any) => d.lat != null).map((d: any) => ({ lat: d.lat, lng: d.lng }));
  const dateStr = new Date(shift.started_at).toLocaleDateString("pt-BR");

  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.brand}>stop<Text style={{ color: theme.red }}>p!</Text></Text>
          <Text style={s.tag}>COMPROVANTE</Text>
        </View>
        <View style={s.redbar} />

        <RouteMap points={points} deliveries={deliv} width={width - 64} height={260} color={theme.orange} />

        <View style={s.grid}>
          <Big label="Distância" value={`${fmtKm(shift.distance_m)} km`} />
          <Big label="Tempo" value={fmtTime(shift.duration_s)} />
          <Big label="Entregas" value={String(shift.deliveries_count)} />
          <Big label="Ritmo" value={`${fmtPace(shift.distance_m, shift.duration_s)}/km`} />
        </View>

        <Text style={s.who}>{String(shift.employee_name || "").toUpperCase()}</Text>
        <View style={s.redbar} />
        <Text style={s.foot}>{dateStr} · Campinas e região</Text>
        <Text style={s.slogan}>AQUI A PARADA É CERTA</Text>
      </View>

      <TouchableOpacity style={s.btn} onPress={() => router.replace("/worker")}>
        <Text style={s.btnTxt}>Concluir</Text>
      </TouchableOpacity>
      <Text style={s.note}>
        Exportar/enviar a imagem ao cliente é o próximo passo (react-native-view-shot). Os dados já ficam salvos no servidor.
      </Text>
    </ScrollView>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "50%", paddingVertical: 10 }}>
      <Text style={s.bigK}>{label}</Text>
      <Text style={s.bigV}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.ink },
  center: { alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#0d0c0b", borderRadius: 16, borderWidth: 1, borderColor: theme.line, padding: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: theme.paper, fontSize: 26, fontWeight: "900" },
  tag: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  redbar: { height: 3, backgroundColor: theme.red, marginVertical: 12, borderRadius: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  bigK: { color: theme.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  bigV: { color: theme.paper, fontSize: 26, fontWeight: "900", marginTop: 2 },
  who: { color: theme.paper, fontSize: 20, fontWeight: "900", marginTop: 8 },
  foot: { color: theme.muted, fontSize: 13, marginTop: 4 },
  slogan: { color: theme.orange, fontSize: 13, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  btn: { backgroundColor: theme.red, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 18 },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  note: { color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 12 },
});
