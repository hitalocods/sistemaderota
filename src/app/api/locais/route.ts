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
  const { nome, cliente_nome, endereco, endereco_link, contato, valor_unidade } = await req.json();

  if (!nome || valor_unidade === undefined) {
    return NextResponse.json(
      { error: "Nome e valor por unidade são obrigatórios" },
      { status: 400 }
    );
  }

  const [local] = await sql`
    insert into locais (nome, cliente_nome, endereco, endereco_link, contato, valor_unidade)
    values (
      ${nome}, 
      ${cliente_nome && typeof cliente_nome === "string" && cliente_nome.trim() !== "" ? cliente_nome.trim() : null}, 
      ${endereco ?? null}, 
      ${endereco_link && typeof endereco_link === "string" && endereco_link.trim() !== "" ? endereco_link.trim() : null}, 
      ${contato ?? null}, 
      ${valor_unidade}
    )
    returning *
  `;

  return NextResponse.json(local, { status: 201 });
}
