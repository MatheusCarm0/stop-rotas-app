import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./config.js";
import { waitForDb, ensureSchema, seedIfEmpty, migrate } from "./db.js";
import { initRealtime } from "./realtime.js";
import { authRouter } from "./routes/auth.js";
import { employeesRouter } from "./routes/employees.js";
import { shiftsRouter } from "./routes/shifts.js";
import { reportsRouter } from "./routes/reports.js";

async function main() {
  await waitForDb();
  await ensureSchema();
  await migrate();
  await seedIfEmpty();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "stoprotas-backend" }));
  app.use("/api/auth", authRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/shifts", shiftsRouter);
  app.use("/api/reports", reportsRouter);

  // Handler de erro padrão
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  });

  const server = createServer(app);
  initRealtime(server);

  server.listen(config.port, () => {
    console.log(`[api] rodando em http://0.0.0.0:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
