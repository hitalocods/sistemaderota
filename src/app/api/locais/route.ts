import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const locais = await sql`
    select * from locais
    where coalesce(excluido, false) = false
    order by nome asc
  `;
  return NextResponse.json(locais);
}

export async function POST(req: Request) {
  const { nome, endereco, contato, valor_unidade } = await req.json();

  if (!nome || valor_unidade === undefined) {
    return NextResponse.json(
      { error: "Nome e valor por unidade são obrigatórios" },
      { status: 400 }
    );
  }

  const [local] = await sql`
    insert into locais (nome, endereco, contato, valor_unidade)
    values (${nome}, ${endereco ?? null}, ${contato ?? null}, ${valor_unidade})
    returning *
  `;

  return NextResponse.json(local, { status: 201 });
}
