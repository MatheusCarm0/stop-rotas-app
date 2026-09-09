// Popula usuários iniciais manualmente. Rode com: npm run seed
// (no Docker: docker compose exec backend npm run seed)
// Obs.: em produção o backend também cria o admin sozinho se o banco estiver vazio.
import { pool, waitForDb } from "./db.js";
import { DEFAULT_USERS, seedUsers } from "./seedData.js";

async function run() {
  await waitForDb();
  await seedUsers(pool);
  for (const u of DEFAULT_USERS) console.log(`[seed] ${u.role.padEnd(6)} ${u.username} / ${u.password}`);
  console.log("[seed] concluído");
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
