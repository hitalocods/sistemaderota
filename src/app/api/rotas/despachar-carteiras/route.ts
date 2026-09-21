import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// POST /api/rotas/despachar-carteiras
// Gera ou atualiza as rotas do dia para os motoboys a partir de suas carteiras
// Body:
//   - data: "2026-09-21"
//   - motoboy_id?: number
//   - motoboy_ids?: number[]
//   - itens?: Array<{ local_id: number; quantidade: number }>
//
// Regra:
// 1. As rotas começam zeradas (quantidade = 0, receita = 0).
// 2. A Dona Rê pode alimentar as quantidades via itens [{ local_id, quantidade }].
export async function POST(req: Request) {
  try {
    const { data, motoboy_id, motoboy_ids, itens } = await req.json();

    if (!data) {
      return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });
    }

    const motoId = motoboy_id ? Number(motoboy_id) : (Array.isArray(motoboy_ids) && motoboy_ids.length === 1 ? Number(motoboy_ids[0]) : null);

    // Caso 1: Despacho com quantidades informadas para um motoboy específico
    if (motoId && Array.isArray(itens) && itens.length > 0) {
      let processadas = 0;

      for (const item of itens) {
        const localId = Number(item.local_id);
        const qtd = Math.max(0, Number(item.quantidade) || 0);

        const [existente] = await sql`
          select id from rotas
          where local_id = ${localId}
            and motoboy_id = ${motoId}
            and data = ${data}::date
        `;

        if (qtd > 0) {
          if (existente) {
            await sql`
              update rotas set
                quantidade = ${qtd},
                receita = (select coalesce(valor_unidade, 0) * ${qtd} from locais where id = ${localId}),
                status = 'pendente'
              where id = ${existente.id}
            `;
          } else {
            await sql`
              insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo, status)
              select
                ${localId},
                ${motoId},
                ${qtd},
                ${data}::date,
                (l.valor_unidade * ${qtd}),
                m.valor_rota,
                'pendente'
              from locais l, motoboys m
              where l.id = ${localId} and m.id = ${motoId}
            `;
          }
          processadas++;
        } else if (existente) {
          // Se a quantidade foi informada como 0 e a rota existia, remove para não poluir
          await sql`delete from rotas where id = ${existente.id}`;
        }
      }

      return NextResponse.json({ ok: true, processadas, data }, { status: 200 });
    }

    // Caso 2: Despacho inicial em massa (começam zeradas com 0 quentinhas e 0.00 de receita)
    let result;
    if (Array.isArray(motoboy_ids) && motoboy_ids.length > 0) {
      result = await sql`
        insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo, status)
        select 
          ml.local_id,
          ml.motoboy_id,
          0,
          ${data}::date,
          0.00,
          m.valor_rota,
          'pendente'
        from motoboy_locais ml
        join locais l on l.id = ml.local_id and l.ativo = true and coalesce(l.excluido, false) = false
        join motoboys m on m.id = ml.motoboy_id and m.ativo = true and coalesce(m.excluido, false) = false
        left join rotas r on r.local_id = ml.local_id and r.motoboy_id = ml.motoboy_id and r.data = ${data}::date
        where ml.ativo = true
          and ml.motoboy_id = ANY(${motoboy_ids}::int[])
          and r.id is null
        order by ml.motoboy_id, ml.ordem asc
        returning id
      `;
    } else {
      result = await sql`
        insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo, status)
        select 
          ml.local_id,
          ml.motoboy_id,
          0,
          ${data}::date,
          0.00,
          m.valor_rota,
          'pendente'
        from motoboy_locais ml
        join locais l on l.id = ml.local_id and l.ativo = true and coalesce(l.excluido, false) = false
        join motoboys m on m.id = ml.motoboy_id and m.ativo = true and coalesce(m.excluido, false) = false
        left join rotas r on r.local_id = ml.local_id and r.motoboy_id = ml.motoboy_id and r.data = ${data}::date
        where ml.ativo = true
          and r.id is null
        order by ml.motoboy_id, ml.ordem asc
        returning id
      `;
    }

    return NextResponse.json({ ok: true, criadas: result.length, data }, { status: 201 });
  } catch (error) {
    console.error("Erro ao despachar carteiras:", error);
    return NextResponse.json({ error: "Falha ao despachar rotas" }, { status: 500 });
  }
}