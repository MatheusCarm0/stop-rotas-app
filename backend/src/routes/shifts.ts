import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { haversine } from "../geo.js";
import { emitToAdmins } from "../realtime.js";

export const shiftsRouter = Router();

/** Snapshot de um turno + nome do funcionário (para eventos em tempo real). */
async function shiftSnapshot(shiftId: number) {
  const { rows } = await pool.query(
    `SELECT s.*, e.name AS employee_name
     FROM shifts s JOIN employees e ON e.id = s.employee_id
     WHERE s.id = $1 LIMIT 1`,
    [shiftId]
  );
  return rows[0] ?? null;
}

// ---- Iniciar expediente (funcionário) ----
shiftsRouter.post("/start", requireAuth, async (req, res) => {
  const empId = req.user!.id;
  await pool.query(
    "UPDATE shifts SET status='ended', ended_at=NOW() WHERE employee_id=$1 AND status='active'",
    [empId]
  );
  const { rows } = await pool.query(
    "INSERT INTO shifts (employee_id, status) VALUES ($1, 'active') RETURNING id",
    [empId]
  );
  const shift = await shiftSnapshot(rows[0].id);
  emitToAdmins("shift:start", shift);
  res.status(201).json(shift);
});

// ---- Encerrar expediente ----
shiftsRouter.post("/:id/end", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query("SELECT * FROM shifts WHERE id=$1 LIMIT 1", [id]);
  const shift = rows[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (req.user!.role !== "admin" && shift.employee_id !== req.user!.id)
    return res.status(403).json({ error: "Sem permissão" });

  const duration = Math.max(0, Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 1000));
  await pool.query(
    "UPDATE shifts SET status='ended', ended_at=NOW(), duration_s=$1, moving=FALSE WHERE id=$2",
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
        recorded_at: z.string(),
      })
    )
    .min(1),
});

shiftsRouter.post("/:id/locations", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = pointsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

  const { rows } = await pool.query("SELECT * FROM shifts WHERE id=$1 LIMIT 1", [id]);
  const shift = rows[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (shift.employee_id !== req.user!.id) return res.status(403).json({ error: "Sem permissão" });
  if (shift.status !== "active") return res.status(409).json({ error: "Turno já encerrado" });

  const pts = parsed.data.points
    .slice()
    .sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at));

  // distância acumulada no servidor (autoritativo), a partir do último ponto salvo
  let prevLat: number | null = shift.last_lat;
  let prevLng: number | null = shift.last_lng;
  let added = 0;
  for (const p of pts) {
    if (prevLat != null && prevLng != null) {
      const d = haversine(prevLat, prevLng, p.lat, p.lng);
      if (d < 500) added += d;
    }
    prevLat = p.lat;
    prevLng = p.lng;
    await pool.query(
      "INSERT INTO location_points (shift_id, lat, lng, speed, moving, recorded_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, p.lat, p.lng, p.speed ?? null, !!p.moving, new Date(p.recorded_at)]
    );
  }

  const last = pts[pts.length - 1];
  const first = pts[0];
  // movimento por DESLOCAMENTO real (o "speed" do GPS costuma vir 0/null)
  let movingFlag: boolean;
  const spanS = (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / 1000;
  if (pts.length >= 2 && spanS > 0) movingFlag = added / spanS > 0.3;
  else if (shift.last_lat != null && shift.last_lng != null)
    movingFlag = haversine(shift.last_lat, shift.last_lng, last.lat, last.lng) > 3;
  else movingFlag = added > 3;

  const addMoving = movingFlag ? Math.min(spanS > 0 ? spanS : 5, 60) : 0;
  const duration = Math.max(0, Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 1000));
  await pool.query(
    `UPDATE shifts
     SET distance_m = distance_m + $1, moving_s = moving_s + $2, last_lat=$3, last_lng=$4,
         last_seen_at=NOW(), moving=$5, duration_s=$6
     WHERE id=$7`,
    [added, addMoving, last.lat, last.lng, movingFlag, duration, id]
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

  const { rows } = await pool.query("SELECT * FROM shifts WHERE id=$1 LIMIT 1", [id]);
  const shift = rows[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (shift.employee_id !== req.user!.id) return res.status(403).json({ error: "Sem permissão" });

  await pool.query(
    "INSERT INTO deliveries (shift_id, lat, lng, note) VALUES ($1, $2, $3, $4)",
    [id, lat, lng, note]
  );
  await pool.query("UPDATE shifts SET deliveries_count = deliveries_count + 1 WHERE id=$1", [id]);

  const snap = await shiftSnapshot(id);
  emitToAdmins("shift:update", snap);
  res.status(201).json({ ok: true, deliveries_count: snap.deliveries_count });
});

// ---- Turnos ativos (admin) ----
shiftsRouter.get("/active", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, e.name AS employee_name,
            EXTRACT(EPOCH FROM (NOW() - s.last_seen_at))::int AS since_seen
     FROM shifts s JOIN employees e ON e.id = s.employee_id
     WHERE s.status='active'
     ORDER BY s.started_at`
  );
  res.json(rows);
});

// ---- Detalhe do turno com pontos e entregas (para o comprovante) ----
shiftsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows: srows } = await pool.query(
    `SELECT s.*, e.name AS employee_name
     FROM shifts s JOIN employees e ON e.id = s.employee_id WHERE s.id=$1 LIMIT 1`,
    [id]
  );
  const shift = srows[0];
  if (!shift) return res.status(404).json({ error: "Turno não encontrado" });
  if (req.user!.role !== "admin" && shift.employee_id !== req.user!.id)
    return res.status(403).json({ error: "Sem permissão" });

  const { rows: points } = await pool.query(
    "SELECT lat, lng, moving, recorded_at FROM location_points WHERE shift_id=$1 ORDER BY recorded_at",
    [id]
  );
  const { rows: deliveries } = await pool.query(
    "SELECT lat, lng, note, created_at FROM deliveries WHERE shift_id=$1 ORDER BY created_at",
    [id]
  );
  res.json({ shift, points, deliveries });
});
