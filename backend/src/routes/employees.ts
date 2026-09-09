import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

export const employeesRouter = Router();

// Lista funcionários (admin)
employeesRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, username, role, active, created_at FROM employees ORDER BY name"
  );
  res.json(rows);
});

// Cria funcionário (admin)
const createSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(4),
  role: z.enum(["admin", "worker"]).default("worker"),
});

employeesRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
  const { name, username, password, role } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      "INSERT INTO employees (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, username, hash, role]
    );
    res.status(201).json({ id: (result as any).insertId, name, username, role });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Nome de usuário já existe" });
    throw err;
  }
});
