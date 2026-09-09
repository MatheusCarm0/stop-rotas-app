import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  db: {
    // URL única (recomendado em nuvem): DB_URL ou MYSQL_URL (ex.: mysql://user:pass@host:3306/db)
    url: process.env.DB_URL || process.env.MYSQL_URL || "",
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "stoprotas",
    password: process.env.DB_PASSWORD ?? "stoprotas",
    database: process.env.DB_NAME ?? "stoprotas",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-troque",
    expires: process.env.JWT_EXPIRES ?? "7d",
  },
};
