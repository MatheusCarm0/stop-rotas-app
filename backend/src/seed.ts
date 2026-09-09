// Popula usuários iniciais. Rode com: npm run seed
// (dentro do Docker: docker compose exec backend npm run seed)
import bcrypt from "bcryptjs";
import { pool, waitForDb } from "./db.js";

const USERS = [
  { name: "Administrador", username: "admin", password: "admin123", role: "admin" as const },
  { name: "Bruno Alves", username: "bruno", password: "senha123", role: "worker" as const },
  { name: "Camila Souza", username: "camila", password: "senha123", role: "worker" as const },
];

async function run() {
  await waitForDb();
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO employees (name, username, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role)`,
      [u.name, u.username, hash, u.role]
    );
    console.log(`[seed] ${u.role.padEnd(6)} ${u.username} / ${u.password}`);
  }
  console.log("[seed] concluído");
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
