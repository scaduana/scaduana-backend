import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;

let config = {};

if (process.env.DATABASE_URL) {
  // Configuración para Render / producción
  config = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else {
  // Configuración local
  config = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "postgres",
    database: process.env.DB_NAME || "scaduana",
    port: Number(process.env.DB_PORT || 5432)
  };
}

export const pool = new Pool(config);
