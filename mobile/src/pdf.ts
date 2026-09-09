import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fmtKm, fmtPace, fmtTime } from "./geo";

const BRAND = "#e1231c";

export interface PdfCtx {
  periodLabel: string;
  employeeLabel: string;
  generatedAt: string;
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}
function fmtDay(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function fmtDateTime(d: string) {
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function shell(title: string, ctx: PdfCtx, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#1a1714;margin:0;padding:28px}
    .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${BRAND};padding-bottom:12px}
    .brand{font-size:26px;font-weight:800}.brand span{color:${BRAND}}
    .tag{text-align:right;color:#6f685d;font-size:12px}
    h1{font-size:20px;margin:18px 0 4px}
    h2{font-size:15px;margin:22px 0 6px}
    .meta{color:#6f685d;font-size:12px;margin-bottom:8px}.meta b{color:#1a1714}
    table{width:100%;border-collapse:collapse;margin:8px 0 8px;font-size:13px}
    th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e3ddd0}
    th{background:#f6f2ea;text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:#6f685d}
    td.n,th.n{text-align:right}
    .kpis{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
    .kpi{flex:1 1 30%;border:1px solid #e3ddd0;border-radius:10px;padding:12px}
    .kpi .k{font-size:11px;color:#6f685d;text-transform:uppercase}.kpi .v{font-size:22px;font-weight:800;margin-top:4px}
    .bar{height:8px;background:${BRAND};border-radius:4px}
    .foot{margin-top:28px;color:#6f685d;font-size:11px;border-top:1px solid #e3ddd0;padding-top:10px}
  </style></head><body>
  <div class="top"><div class="brand">stop<span>p!</span></div><div class="tag">Stop Rotas<br/>Relatório de campo</div></div>
  <h1>${esc(title)}</h1>
  <div class="meta">Período: <b>${esc(ctx.periodLabel)}</b> &nbsp;·&nbsp; Colaborador: <b>${esc(ctx.employeeLabel)}</b> &nbsp;·&nbsp; Gerado em <b>${esc(ctx.generatedAt)}</b></div>
  ${body}
  <div class="foot">Stop Panfletos · Stop Rotas · Aqui a parada é certa</div>
  </body></html>`;
}

export function kpisHtml(su: any) {
  const hours = Number(su?.duration_s || 0) / 3600;
  const speed = Number(su?.duration_s) > 0 ? (Number(su.distance_m) / 1000) / (Number(su.duration_s) / 3600) : 0;
  const eff = Number(su?.duration_s) > 0 ? Math.round((Number(su.moving_s) / Number(su.duration_s)) * 100) : 0;
  return `<div class="kpis">
    <div class="kpi"><div class="k">Distância total</div><div class="v">${fmtKm(Number(su?.distance_m || 0))} km</div></div>
    <div class="kpi"><div class="k">Horas em campo</div><div class="v">${hours.toFixed(1)} h</div></div>
    <div class="kpi"><div class="k">Expedientes</div><div class="v">${su?.shifts ?? 0}</div></div>
    <div class="kpi"><div class="k">Vel. média</div><div class="v">${speed.toFixed(1)} km/h</div></div>
    <div class="kpi"><div class="k">Eficiência</div><div class="v">${eff}%</div></div>
    <div class="kpi"><div class="k">Colaboradores</div><div class="v">${su?.workers ?? 0}</div></div>
  </div>`;
}

export function dailyHtml(daily: any[]) {
  const max = Math.max(1, ...daily.map((d) => Number(d.distance_m)));
  const rows = daily
    .map((d) => {
      const km = Number(d.distance_m) / 1000;
      const w = Math.round((Number(d.distance_m) / max) * 100);
      return `<tr><td>${fmtDay(d.day)}</td><td class="n">${km.toFixed(2)}</td><td style="width:45%"><div class="bar" style="width:${w}%"></div></td><td class="n">${fmtTime(Number(d.duration_s))}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Dia</th><th class="n">Km</th><th>Distância</th><th class="n">Tempo</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sem dados no período</td></tr>'}</tbody></table>`;
}

export function rankingHtml(rk: any[]) {
  const rows = rk
    .filter((r) => Number(r.shifts) > 0)
    .map((r, i) => `<tr><td>${i + 1}º ${esc(r.name)}</td><td class="n">${fmtKm(Number(r.distance_m))}</td><td class="n">${(Number(r.duration_s) / 3600).toFixed(1)}</td><td class="n">${fmtPace(Number(r.distance_m), Number(r.moving_s) || Number(r.duration_s))}</td></tr>`)
    .join("");
  return `<table><thead><tr><th>Colaborador</th><th class="n">Km</th><th class="n">Horas</th><th class="n">Ritmo</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sem dados no período</td></tr>'}</tbody></table>`;
}

export function historyHtml(hi: any[]) {
  const rows = hi
    .map((h) => `<tr><td>${esc(h.employee_name)}</td><td>${fmtDateTime(h.started_at)}</td><td class="n">${fmtKm(Number(h.distance_m))}</td><td class="n">${fmtTime(Number(h.duration_s))}</td><td>${h.status === "active" ? "Em andamento" : "Encerrado"}</td></tr>`)
    .join("");
  return `<table><thead><tr><th>Colaborador</th><th>Início</th><th class="n">Km</th><th class="n">Tempo</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nenhum expediente</td></tr>'}</tbody></table>`;
}

/** Gera o PDF e abre o menu de compartilhar/salvar. */
export async function exportPdf(title: string, ctx: PdfCtx, body: string) {
  const html = shell(title, ctx, body);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  }
  return uri;
}
