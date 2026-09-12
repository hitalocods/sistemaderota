import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { status } = await req.json();

  if (!["pendente", "entregue", "cancelada"].includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const entregueEm = status === "entregue" ? new Date().toISOString() : null;

  const [rota] = await sql`
    update rotas set
      status = ${status},
      entregue_em = ${entregueEm}
    where id = ${params.id}
    returning *
  `;

  if (!rota) {
    return NextResponse.json({ error: "Rota não encontrada" }, { status: 404 });
  }

  return NextResponse.json(rota);
}
