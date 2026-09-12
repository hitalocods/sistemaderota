import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export async function GET() {
  const motoboys = await sql`
    select id, nome, login, whatsapp, valor_rota, ativo, criado_em
    from motoboys
    where coalesce(excluido, false) = false
    order by nome asc
  `;
  return NextResponse.json(motoboys);
}

export async function POST(req: Request) {
  const { nome, login, senha, valor_rota, whatsapp } = await req.json();

  if (!nome || !login || !senha || valor_rota === undefined) {
    return NextResponse.json(
      { error: "Nome, login, senha e valor por rota são obrigatórios" },
      { status: 400 }
    );
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  const [motoboy] = await sql`
    insert into motoboys (nome, login, senha_hash, valor_rota, whatsapp)
    values (${nome}, ${login}, ${senha_hash}, ${valor_rota}, ${whatsapp || null})
    returning id, nome, login, whatsapp, valor_rota, ativo, criado_em
  `;

  return NextResponse.json(motoboy, { status: 201 });
}
