import { neon } from "@neondatabase/serverless";

// DATABASE_URL vem do painel da Vercel/Neon ou usa o fallback do banco oficial
const dbUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_hg7DxXpm9TPz@ep-bitter-wave-aw52t9pu-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

export const sql = neon(dbUrl);
