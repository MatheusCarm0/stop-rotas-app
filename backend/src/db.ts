import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { config } from "./config.js";
import { seedUsers } from "./seedData.js";

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
});

/** Cria as tabelas a partir do schema.sql (idempotente — CREATE TABLE IF NOT EXISTS).
 *  Necessário em bancos gerenciados (Railway etc.), onde o init do container não roda. */
export async function ensureSchema(): Promise<void> {
  const raw = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  const cleaned = raw
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const statements = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
  for (const st of statements) await pool.query(st);
  console.log(`[db] schema garantido (${statements.length} tabelas/objetos)`);
}

/** Cria os usuários padrão só se o banco estiver vazio (admin/admin123). */
export async function seedIfEmpty(): Promise<void> {
  const [rows] = await pool.query("SELECT COUNT(*) AS c FROM employees");
  if ((rows as any[])[0].c > 0) return;
  await seedUsers(pool);
  console.log("[db] usuários padrão criados (admin/admin123) — TROQUE a senha após o 1º login");
}

/** Migrações idempotentes (MySQL não tem ADD COLUMN IF NOT EXISTS). */
export async function migrate(): Promise<void> {
  await ensureColumn("shifts", "moving_s", "INT NOT NULL DEFAULT 0");
}
async function ensureColumn(table: string, col: string, ddl: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [config.db.database, table, col]
  );
  if ((rows as any[])[0].c === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${ddl}`);
    console.log(`[db] migrado: ${table}.${col}`);
  }
}

/** Espera o MySQL aceitar conexões (útil ao subir junto no Docker). */
export async function waitForDb(retries = 30, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log("[db] conectado ao MySQL");
      return;
    } catch (err) {
      console.log(`[db] aguardando MySQL (${i}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Não foi possível conectar ao MySQL");
}
