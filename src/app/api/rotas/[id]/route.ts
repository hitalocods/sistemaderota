import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, local_id, motoboy_id, quantidade } = body;

    // Buscar a rota atual
    const [rotaAtual] = await sql`
      select * from rotas where id = ${params.id}
    `;

    if (!rotaAtual) {
      return NextResponse.json({ error: "Rota não encontrada" }, { status: 404 });
    }

    // 1. Se for apenas alteração de status (botão entregar/reabrir)
    if (status && local_id === undefined && motoboy_id === undefined && quantidade === undefined) {
      if (!["pendente", "entregue", "cancelada"].includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }

      const entregueEm = status === "entregue" ? new Date().toISOString() : null;

      const [rotaAtualizada] = await sql`
        update rotas set
          status = ${status},
          entregue_em = ${entregueEm}
        where id = ${params.id}
        returning *
      `;

      return NextResponse.json(rotaAtualizada);
    }

    // 2. Edição completa da rota (local, motoboy, quantidade e/ou status)
    const novoLocalId = local_id !== undefined ? Number(local_id) : rotaAtual.local_id;
    const novoMotoboyId = motoboy_id !== undefined ? Number(motoboy_id) : rotaAtual.motoboy_id;
    const novaQuantidade = quantidade !== undefined ? Number(quantidade) : rotaAtual.quantidade;
    const novoStatus = status || rotaAtual.status;

    if (novaQuantidade <= 0) {
      return NextResponse.json({ error: "Quantidade deve ser maior que zero" }, { status: 400 });
    }

    const [local] = await sql`select valor_unidade from locais where id = ${novoLocalId}`;
    const [motoboy] = await sql`select valor_rota from motoboys where id = ${novoMotoboyId}`;

    if (!local || !motoboy) {
      return NextResponse.json({ error: "Local ou motoboy não encontrado" }, { status: 400 });
    }

    const novaReceita = Number(local.valor_unidade) * novaQuantidade;
    const novoCusto = Number(motoboy.valor_rota);
    const entregueEm = novoStatus === "entregue" 
      ? (rotaAtual.entregue_em || new Date().toISOString()) 
      : null;

    const [rotaAtualizada] = await sql`
      update rotas set
        local_id = ${novoLocalId},
        motoboy_id = ${novoMotoboyId},
        quantidade = ${novaQuantidade},
        receita = ${novaReceita},
        custo = ${novoCusto},
        status = ${novoStatus},
        entregue_em = ${entregueEm}
      where id = ${params.id}
      returning *
    `;

    return NextResponse.json(rotaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar rota:", error);
    return NextResponse.json({ error: "Falha ao atualizar rota" }, { status: 500 });
  }
}
