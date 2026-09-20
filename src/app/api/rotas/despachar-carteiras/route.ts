import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// POST /api/rotas/despachar-carteiras
// Gera as rotas do dia automaticamente a partir das carteiras ativas
// Body: { data: "2026-09-20", motoboy_ids?: number[] }
// - usa qtd_padrao de cada local na carteira
// - calcula receita e custo com valores atuais
// - idempotente: ignora combinacoes local+motoboy que ja tem rota no dia
export async function POST(req: Request) {
  try {
    const { data, motoboy_ids } = await req.json();

    if (!data) {
      return NextResponse.json({ error: "Data e obrigatoria" }, { status: 400 });
    }

    // Buscar carteiras: todos os motoboys ativos ou apenas os informados
    let result;
    if (Array.isArray(motoboy_ids) && motoboy_ids.length > 0) {
      result = await sql`
        insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo, status)
        select 
          ml.local_id,
          ml.motoboy_id,
          ml.qtd_padrao,
          ${data}::date,
          (l.valor_unidade * ml.qtd_padrao),
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
          ml.qtd_padrao,
          ${data}::date,
          (l.valor_unidade * ml.qtd_padrao),
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