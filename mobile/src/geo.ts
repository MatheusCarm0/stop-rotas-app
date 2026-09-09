export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function fmtKm(m: number): string {
  return (m / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtTime(s: number): string {
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`;
}

export function fmtPace(distM: number, elapsedS: number): string {
  if (distM < 20) return "--";
  const spk = elapsedS / (distM / 1000);
  const m = Math.floor(spk / 60);
  const s = Math.round(spk % 60);
  return `${m}'${s < 10 ? "0" : ""}${s}"`;
}

export interface Pt {
  lat: number;
  lng: number;
}

/** Projeta uma lista de {lat,lng} para coordenadas de tela (para desenhar em SVG). */
export function projectPoints(points: Pt[], w: number, h: number, pad = 16) {
  if (points.length === 0) return [] as { x: number; y: number }[];
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  }
  const rangeLat = Math.max(maxLat - minLat, 1e-6);
  const rangeLng = Math.max(maxLng - minLng, 1e-6);
  const sc = Math.min((w - 2 * pad) / rangeLng, (h - 2 * pad) / rangeLat);
  const ox = (w - rangeLng * sc) / 2;
  const oy = (h - rangeLat * sc) / 2;
  return points.map((p) => ({
    x: (p.lng - minLng) * sc + ox,
    y: (maxLat - p.lat) * sc + oy, // norte para cima
  }));
}
