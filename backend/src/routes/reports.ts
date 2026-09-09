import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

export const reportsRouter = Router();

// Entregas por mês (últimos N meses) — para o gráfico do painel
reportsRouter.get("/monthly", requireAuth, requireAdmin, async (req, res) => {
  const months = Math.min(24, Math.max(1, Number(req.query.months ?? 6)));
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS total
     FROM deliveries
     WHERE created_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY ym ORDER BY ym`,
    [months - 1]
  );
  res.json(rows);
});

// Desempenho por funcionário num período (default: mês atual)
reportsRouter.get("/performance", requireAuth, requireAdmin, async (req, res) => {
  const from = (req.query.from as string) || null; // 'YYYY-MM-DD'
  const to = (req.query.to as string) || null;
  const where =
    from && to ? "AND s.started_at BETWEEN ? AND ?" : "AND s.started_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
  const params = from && to ? [from, to] : [];
  const [rows] = await pool.query(
    `SELECT e.id, e.name,
            COUNT(DISTINCT s.id) AS shifts,
            COALESCE(SUM(s.distance_m),0) AS distance_m,
            COALESCE(SUM(s.duration_s),0) AS duration_s,
            COALESCE(SUM(s.deliveries_count),0) AS deliveries
     FROM employees e
     LEFT JOIN shifts s ON s.employee_id = e.id ${where}
     WHERE e.role = 'worker'
     GROUP BY e.id, e.name
     ORDER BY distance_m DESC`,
    params
  );
  res.json(rows);
});

// Resumo do dia (KPIs do topo do painel)
reportsRouter.get("/today", requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(CASE WHEN status='active' THEN 1 END) AS active_shifts,
       COALESCE(SUM(distance_m),0) AS distance_m,
       COALESCE(SUM(deliveries_count),0) AS deliveries,
       COALESCE(AVG(duration_s),0) AS avg_duration_s
     FROM shifts
     WHERE started_at >= CURDATE()`
  );
  res.json((rows as any[])[0]);
});
