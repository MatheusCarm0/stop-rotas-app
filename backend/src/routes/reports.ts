import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

export const reportsRouter = Router();

function daysParam(v: unknown, def = 30) {
  return Math.min(365, Math.max(1, Number(v ?? def)));
}
function empParam(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Entregas por mês (últimos N meses)
reportsRouter.get("/monthly", requireAuth, requireAdmin, async (req, res) => {
  const months = Math.min(24, Math.max(1, Number(req.query.months ?? 6)));
  const { rows } = await pool.query(
    `SELECT to_char(created_at, 'YYYY-MM') AS ym, COUNT(*) AS total
     FROM deliveries
     WHERE created_at >= date_trunc('month', CURRENT_DATE) - (($1::int) * INTERVAL '1 month')
     GROUP BY ym ORDER BY ym`,
    [months - 1]
  );
  res.json(rows);
});

// Desempenho por funcionário (mês atual por padrão)
reportsRouter.get("/performance", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT e.id, e.name,
            COUNT(s.id) AS shifts,
            COALESCE(SUM(s.distance_m),0) AS distance_m,
            COALESCE(SUM(s.duration_s),0) AS duration_s,
            COALESCE(SUM(s.deliveries_count),0) AS deliveries
     FROM employees e
     LEFT JOIN shifts s ON s.employee_id = e.id
        AND s.started_at >= date_trunc('month', CURRENT_DATE)
     WHERE e.role = 'worker'
     GROUP BY e.id, e.name
     ORDER BY distance_m DESC`
  );
  res.json(rows);
});

// Resumo do dia (KPIs do painel)
reportsRouter.get("/today", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status='active') AS active_shifts,
       COALESCE(SUM(distance_m),0) AS distance_m,
       COALESCE(SUM(deliveries_count),0) AS deliveries,
       COALESCE(AVG(duration_s),0) AS avg_duration_s
     FROM shifts
     WHERE started_at >= CURRENT_DATE`
  );
  res.json(rows[0]);
});

// Resumo do período — KPIs principais dos relatórios
reportsRouter.get("/summary", requireAuth, requireAdmin, async (req, res) => {
  const days = daysParam(req.query.days);
  const emp = empParam(req.query.employee);
  const params: any[] = [days - 1];
  if (emp) params.push(emp);
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(distance_m),0)  AS distance_m,
       COALESCE(SUM(duration_s),0)  AS duration_s,
       COALESCE(SUM(moving_s),0)    AS moving_s,
       COUNT(*)                     AS shifts,
       COUNT(DISTINCT started_at::date) AS active_days,
       COUNT(DISTINCT employee_id)  AS workers
     FROM shifts
     WHERE started_at >= CURRENT_DATE - (($1::int) * INTERVAL '1 day') ${emp ? "AND employee_id = $2" : ""}`,
    params
  );
  res.json(rows[0]);
});

// Distância e tempo por dia (para o gráfico)
reportsRouter.get("/daily", requireAuth, requireAdmin, async (req, res) => {
  const days = daysParam(req.query.days, 14);
  const emp = empParam(req.query.employee);
  const params: any[] = [days - 1];
  if (emp) params.push(emp);
  const { rows } = await pool.query(
    `SELECT to_char(started_at, 'YYYY-MM-DD') AS day,
            COALESCE(SUM(distance_m),0) AS distance_m,
            COALESCE(SUM(duration_s),0) AS duration_s
     FROM shifts
     WHERE started_at >= CURRENT_DATE - (($1::int) * INTERVAL '1 day') ${emp ? "AND employee_id = $2" : ""}
     GROUP BY day ORDER BY day`,
    params
  );
  res.json(rows);
});

// Ranking por colaborador no período
reportsRouter.get("/ranking", requireAuth, requireAdmin, async (req, res) => {
  const days = daysParam(req.query.days);
  const emp = empParam(req.query.employee);
  const params: any[] = [days - 1];
  if (emp) params.push(emp);
  const { rows } = await pool.query(
    `SELECT e.id, e.name,
            COUNT(s.id) AS shifts,
            COALESCE(SUM(s.distance_m),0) AS distance_m,
            COALESCE(SUM(s.duration_s),0) AS duration_s,
            COALESCE(SUM(s.moving_s),0)   AS moving_s,
            MAX(s.started_at) AS last_active
     FROM employees e
     LEFT JOIN shifts s ON s.employee_id = e.id
        AND s.started_at >= CURRENT_DATE - (($1::int) * INTERVAL '1 day')
     WHERE e.role = 'worker' ${emp ? "AND e.id = $2" : ""}
     GROUP BY e.id, e.name
     ORDER BY distance_m DESC`,
    params
  );
  res.json(rows);
});

// Histórico dos últimos expedientes
reportsRouter.get("/shifts", requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const days = daysParam(req.query.days, 365);
  const emp = empParam(req.query.employee);
  const params: any[] = [days - 1];
  if (emp) params.push(emp);
  params.push(limit);
  const empClause = emp ? "AND s.employee_id = $2" : "";
  const limitPos = emp ? "$3" : "$2";
  const { rows } = await pool.query(
    `SELECT s.id, s.status, s.started_at, s.ended_at, s.distance_m, s.duration_s, s.moving_s,
            e.name AS employee_name
     FROM shifts s JOIN employees e ON e.id = s.employee_id
     WHERE s.started_at >= CURRENT_DATE - (($1::int) * INTERVAL '1 day') ${empClause}
     ORDER BY s.started_at DESC
     LIMIT ${limitPos}`,
    params
  );
  res.json(rows);
});
