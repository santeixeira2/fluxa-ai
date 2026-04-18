import { Pool } from "pg";
import { config } from "@/config";

export const db = new Pool({
  connectionString: String(config.postgresUrl),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false,
  },
  maxUses: 1000,
});
