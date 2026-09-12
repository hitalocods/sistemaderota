import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_hg7DxXpm9TPz@ep-bitter-wave-aw52t9pu-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(databaseUrl);

async function run() {
  const hash = await bcrypt.hash("123456", 10);
  await sql`update motoboys set senha_hash = ${hash}`;
  console.log("Todas as senhas dos motoboys (junior, carlos, anderson) foram atualizadas para '123456'!");
}

run().catch(console.error);
