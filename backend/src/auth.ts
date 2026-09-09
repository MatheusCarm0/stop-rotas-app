import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export interface AuthUser {
  id: number;
  name: string;
  role: "admin" | "worker";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, config.jwt.secret, { expiresIn: config.jwt.expires as any });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;
    return { id: payload.id, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

/** Middleware: exige um Bearer token válido. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "Não autenticado" });
  req.user = user;
  next();
}

/** Middleware: exige papel de admin. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Acesso restrito ao administrador" });
  next();
}
