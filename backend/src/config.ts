import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  db: {
    // URL única (recomendado em nuvem): no Render, use a Internal Database URL do Postgres.
    url: process.env.DATABASE_URL || process.env.DB_URL || "",
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "stoprotas",
    password: process.env.DB_PASSWORD ?? "stoprotas",
    database: process.env.DB_NAME ?? "stoprotas",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-troque",
    expires: process.env.JWT_EXPIRES ?? "7d",
  },
};
