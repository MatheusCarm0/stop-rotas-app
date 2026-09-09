import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { signToken } from "../auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
  const { username, password } = parsed.data;

  const [rows] = await pool.query(
    "SELECT id, name, username, password_hash, role, active FROM employees WHERE username = ? LIMIT 1",
    [username]
  );
  const user = (rows as any[])[0];
  if (!user || !user.active)
    return res.status(401).json({ error: "Usuário ou senha inválidos" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Usuário ou senha inválidos" });

  const authUser = { id: user.id, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.json({ token, user: authUser });
});
