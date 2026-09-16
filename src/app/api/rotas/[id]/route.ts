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

    // 1. Ações de Ajuste / Conferência de Carga
    if (body.acao) {
      if (body.acao === "solicitar_ajuste") {
        const qtdAjuste = Number(body.ajuste_quantidade);
        if (!qtdAjuste || qtdAjuste <= 0) {
          return NextResponse.json({ error: "Quantidade informada deve ser maior que zero" }, { status: 400 });
        }

        const [rotaAtualizada] = await sql`
          update rotas set
            ajuste_quantidade = ${qtdAjuste},
            ajuste_status = 'pendente',
            ajuste_solicitado_em = now(),
            ajuste_respondido_em = null
          where id = ${params.id}
          returning *
        `;
        return NextResponse.json(rotaAtualizada);
      }

      if (body.acao === "cancelar_ajuste") {
        const [rotaAtualizada] = await sql`
          update rotas set
            ajuste_quantidade = null,
            ajuste_status = null,
            ajuste_solicitado_em = null,
            ajuste_respondido_em = null
          where id = ${params.id}
          returning *
        `;
        return NextResponse.json(rotaAtualizada);
      }

      if (body.acao === "aprovar_ajuste") {
        const novaQtd = rotaAtual.ajuste_quantidade ? Number(rotaAtual.ajuste_quantidade) : rotaAtual.quantidade;
        const [local] = await sql`select valor_unidade from locais where id = ${rotaAtual.local_id}`;
        const novaReceita = local ? Number(local.valor_unidade) * novaQtd : rotaAtual.receita;

        const [rotaAtualizada] = await sql`
          update rotas set
            quantidade = ${novaQtd},
            receita = ${novaReceita},
            ajuste_status = 'aprovado',
            ajuste_respondido_em = now()
          where id = ${params.id}
          returning *
        `;
        return NextResponse.json(rotaAtualizada);
      }

      if (body.acao === "recusar_ajuste") {
        const [rotaAtualizada] = await sql`
          update rotas set
            ajuste_status = 'recusado',
            ajuste_respondido_em = now()
          where id = ${params.id}
          returning *
        `;
        return NextResponse.json(rotaAtualizada);
      }

      if (body.acao === "conferir_carga") {
        const conferido = body.conferido !== undefined ? Boolean(body.conferido) : true;
        const [rotaAtualizada] = await sql`
          update rotas set
            carga_conferida = ${conferido},
            carga_conferida_em = ${conferido ? new Date().toISOString() : null}
          where id = ${params.id}
          returning *
        `;
        return NextResponse.json(rotaAtualizada);
      }

      return NextResponse.json({ error: "Ação de ajuste desconhecida" }, { status: 400 });
    }

    // 2. Se for apenas alteração de status (botão entregar/reabrir)
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

    // 3. Edição completa da rota (local, motoboy, quantidade e/ou status)
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rotaId = Number(params.id);
    if (!rotaId || isNaN(rotaId)) {
      return NextResponse.json({ error: "ID de rota inválido" }, { status: 400 });
    }

    const [rotaExcluida] = await sql`
      delete from rotas
      where id = ${rotaId}
      returning *
    `;

    if (!rotaExcluida) {
      return NextResponse.json({ error: "Rota não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, rota: rotaExcluida });
  } catch (error) {
    console.error("Erro ao excluir rota:", error);
    return NextResponse.json({ error: "Falha ao excluir rota" }, { status: 500 });
  }
}

