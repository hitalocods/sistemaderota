import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// POST /api/rotas/duplicar
// Body: { de: "2026-09-18", para: "2026-09-19" }
// Copia todas as rotas do dia `de` para o dia `para` (status pendente)
// Recalcula receita e custo com os valores atuais de locais e motoboys
export async function POST(req: Request) {
  try {
    const { de, para } = await req.json();

    if (!de || !para) {
      return NextResponse.json(
        { error: "Informe as datas de origem e destino" },
        { status: 400 }
      );
    }

    if (de === para) {
      return NextResponse.json(
        { error: "A data de destino deve ser diferente da data de origem" },
        { status: 400 }
      );
    }

    // Buscar todas as rotas do dia de origem (qualquer status)
    const rotasOrigem = await sql`
      select
        r.local_id, r.motoboy_id, r.quantidade,
        l.valor_unidade,
        m.valor_rota
      from rotas r
      inner join locais l on l.id = r.local_id
      inner join motoboys m on m.id = r.motoboy_id
      where r.data = ${de}::date
      order by r.id asc
    `;

    if (rotasOrigem.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma rota encontrada na data de origem" },
        { status: 404 }
      );
    }

    // Inserir todas as rotas para o dia destino com status pendente
    let duplicadas = 0;
    for (const r of rotasOrigem) {
      const receita = Number(r.valor_unidade) * Number(r.quantidade);
      const custo = Number(r.valor_rota);

      await sql`
        insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo, status)
        values (
          ${r.local_id},
          ${r.motoboy_id},
          ${r.quantidade},
          ${para}::date,
          ${receita},
          ${custo},
          'pendente'
        )
      `;
      duplicadas++;
    }

    return NextResponse.json({ duplicadas, de, para }, { status: 201 });
  } catch (error) {
    console.error("Erro ao duplicar rotas:", error);
    return NextResponse.json({ error: "Falha ao duplicar rotas" }, { status: 500 });
  }
}
