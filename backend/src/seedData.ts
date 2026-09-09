import bcrypt from "bcryptjs";
import type { Pool } from "mysql2/promise";

export const DEFAULT_USERS = [
  { name: "Administrador", username: "admin", password: "admin123", role: "admin" as const },
  { name: "Bruno Alves", username: "bruno", password: "senha123", role: "worker" as const },
  { name: "Camila Souza", username: "camila", password: "senha123", role: "worker" as const },
];

/** Cria/atualiza os usuários padrão (idempotente). */
export async function seedUsers(pool: Pool) {
  for (const u of DEFAULT_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO employees (name, username, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role)`,
      [u.name, u.username, hash, u.role]
    );
  }
}
