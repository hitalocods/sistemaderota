import { neon } from "@neondatabase/serverless";

// DATABASE_URL vem do painel da Vercel/Neon (Settings > Environment Variables)
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não configurada");
}

export const sql = neon(process.env.DATABASE_URL);
