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
