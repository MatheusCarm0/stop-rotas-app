import mysql from "mysql2/promise";
import { config } from "./config.js";

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
