import pg from "pg";
import { readFileSync } from "node:fs";
import { config } from "./config.js";
import { seedUsers } from "./seedData.js";

const { Pool } = pg;

// Retorna INT8/NUMERIC como número quando cabe (evita strings em somas/contagens).
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric

const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

export const pool = config.db.url
  ? new Pool({ connectionString: config.db.url, ssl, max: 10 })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl,
      max: 10,
    });

/** Cria as tabelas a partir do schema.sql (idempotente). */
export async function ensureSchema(): Promise<void> {
  const raw = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  const cleaned = raw
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const statements = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
  for (const st of statements) await pool.query(st);
  console.log(`[db] schema garantido (${statements.length} objetos)`);
}

/** Migrações idempotentes. */
export async function migrate(): Promise<void> {
  await pool.query("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS moving_s INT NOT NULL DEFAULT 0");
}

/** Cria os usuários padrão só se o banco estiver vazio (admin/admin123). */
export async function seedIfEmpty(): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM employees");
  if (Number(rows[0].c) > 0) return;
  await seedUsers(pool);
  console.log("[db] usuários padrão criados (admin/admin123) — TROQUE a senha após o 1º login");
}

/** Espera o banco aceitar conexões (útil ao subir junto no Docker). */
export async function waitForDb(retries = 30, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("[db] conectado ao PostgreSQL");
      return;
    } catch {
      console.log(`[db] aguardando PostgreSQL (${i}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Não foi possível conectar ao PostgreSQL");
}
