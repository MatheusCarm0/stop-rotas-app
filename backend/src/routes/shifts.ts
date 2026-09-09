import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { haversine } from "../geo.js";
import { emitToAdmins } from "../realtime.js";

export const shiftsRouter = Router();

/** Snapshot de um turno + nome do funcionário (para eventos em tempo real). */
async function shiftSnapshot(shiftId: number) {
  const [rows] = await pool.query(
    `SELECT s.*, e.name AS employee_name
     FROM shifts s JOIN employees e ON e.id = s.employee_id
     WHERE s.id = ? LIMIT 1`,
    [shiftId]
  );
  return (rows as any[])[0] ?? null;
}

// ---- Iniciar expediente (funcionário) ----
shiftsRouter.post("/start", requireAuth, async (req, res) => {
  const empId = req.user!.id;
  // encerra qualquer turno pendente do mesmo funcionário
  await pool.query(
    "UPDATE shifts SET status='ended', ended_at=NOW() WHERE employee_id=? AND status='active'",
    [empId]
  );
  const [result] = await pool.query(
    "INSERT INTO shifts (employee_id, status) VALUES (?, 'active')",
    [empId]
  );
  const shift = await shiftSnapshot((result as any).insertId);
  emitToAdmins("shift:start", shift);
  res.status(201).json(shift);
});

// ---- Encerrar expediente ----
shiftsRouter.post("/:id/end", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query("SELECT * FROM shifts WHERE id=? LIMIT 1", [id]);
  const shift = (rows as any[])[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (req.user!.role !== "admin" && shift.employee_id !== req.user!.id)
    return res.status(403).json({ error: "Sem permissão" });

  const duration = Math.max(
    0,
    Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 1000)
  );
  await pool.query(
    "UPDATE shifts SET status='ended', ended_at=NOW(), duration_s=?, moving=0 WHERE id=?",
    [duration, id]
  );
  const snap = await shiftSnapshot(id);
  emitToAdmins("shift:end", snap);
  res.json(snap);
});

// ---- Enviar lote de pontos de GPS (funcionário) ----
const pointsSchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        speed: z.number().nullable().optional(),
        moving: z.boolean().optional(),
        recorded_at: z.string(), // ISO
      })
    )
    .min(1),
});

shiftsRouter.post("/:id/locations", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = pointsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

  const [rows] = await pool.query("SELECT * FROM shifts WHERE id=? LIMIT 1", [id]);
  const shift = (rows as any[])[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (shift.employee_id !== req.user!.id)
    return res.status(403).json({ error: "Sem permissão" });
  if (shift.status !== "active")
    return res.status(409).json({ error: "Turno já encerrado" });

  const pts = parsed.data.points
    .slice()
    .sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at));

  // distância acumulada no servidor (autoritativo), a partir do último ponto salvo
  let prevLat: number | null = shift.last_lat;
  let prevLng: number | null = shift.last_lng;
  let added = 0;
  const values: any[] = [];
  for (const p of pts) {
    if (prevLat != null && prevLng != null) {
      const d = haversine(prevLat, prevLng, p.lat, p.lng);
      if (d < 500) added += d; // ignora saltos de GPS absurdos
    }
    prevLat = p.lat;
    prevLng = p.lng;
    values.push([id, p.lat, p.lng, p.speed ?? null, p.moving ? 1 : 0, new Date(p.recorded_at)]);
  }

  await pool.query(
    "INSERT INTO location_points (shift_id, lat, lng, speed, moving, recorded_at) VALUES ?",
    [values]
  );

  const last = pts[pts.length - 1];
  const duration = Math.max(
    0,
    Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 1000)
  );
  await pool.query(
    `UPDATE shifts
     SET distance_m = distance_m + ?, last_lat=?, last_lng=?, last_seen_at=NOW(),
         moving=?, duration_s=?
     WHERE id=?`,
    [added, last.lat, last.lng, last.moving ? 1 : 0, duration, id]
  );

  const snap = await shiftSnapshot(id);
  emitToAdmins("shift:update", { ...snap, lastPoint: { lat: last.lat, lng: last.lng } });
  res.json({ ok: true, distance_m: snap.distance_m, duration_s: snap.duration_s });
});

// ---- Registrar entrega ----
const deliverySchema = z.object({
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  note: z.string().max(255).nullable().optional(),
});

shiftsRouter.post("/:id/deliveries", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = deliverySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
  const { lat = null, lng = null, note = null } = parsed.data;

  const [rows] = await pool.query("SELECT * FROM shifts WHERE id=? LIMIT 1", [id]);
  const shift = (rows as any[])[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (shift.employee_id !== req.user!.id)
    return res.status(403).json({ error: "Sem permissão" });

  await pool.query(
    "INSERT INTO deliveries (shift_id, lat, lng, note) VALUES (?, ?, ?, ?)",
    [id, lat, lng, note]
  );
  await pool.query("UPDATE shifts SET deliveries_count = deliveries_count + 1 WHERE id=?", [id]);

  const snap = await shiftSnapshot(id);
  emitToAdmins("shift:update", snap);
  res.status(201).json({ ok: true, deliveries_count: snap.deliveries_count });
});

// ---- Turnos ativos (admin) ----
shiftsRouter.get("/active", requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, e.name AS employee_name
     FROM shifts s JOIN employees e ON e.id = s.employee_id
     WHERE s.status='active'
     ORDER BY s.started_at`
  );
  res.json(rows);
});

// ---- Detalhe do turno com pontos e entregas (para o comprovante) ----
shiftsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [srows] = await pool.query(
    `SELECT s.*, e.name AS employee_name
     FROM shifts s JOIN employees e ON e.id = s.employee_id WHERE s.id=? LIMIT 1`,
    [id]
  );
  const shift = (srows as any[])[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (req.user!.role !== "admin" && shift.employee_id !== req.user!.id)
    return res.status(403).json({ error: "Sem permissão" });

  const [points] = await pool.query(
    "SELECT lat, lng, moving, recorded_at FROM location_points WHERE shift_id=? ORDER BY recorded_at",
    [id]
  );
  const [deliveries] = await pool.query(
    "SELECT lat, lng, note, created_at FROM deliveries WHERE shift_id=? ORDER BY created_at",
    [id]
  );
  res.json({ shift, points, deliveries });
});
