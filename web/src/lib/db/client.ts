import "server-only";
import postgres from "postgres";

import { env } from "@/lib/env";

declare global {
  var __pgSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  return postgres(env.DATABASE_URL, {
    max: 8,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    transform: {
      undefined: null,
    },
  });
}

export const sql = globalThis.__pgSql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgSql = sql;
}
