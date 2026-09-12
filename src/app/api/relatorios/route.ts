import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/relatorios?de=2026-09-01&ate=2026-09-07
// Considera apenas rotas com status 'entregue' nas somas de quentinhas/receita.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");

  const porMotoboy = await sql`
    select
      m.id, m.nome,
      count(r.id) filter (where r.status = 'entregue') as rotas,
      coalesce(sum(r.quantidade) filter (where r.status = 'entregue'), 0) as quentinhas,
      coalesce(sum(r.custo) filter (where r.status = 'entregue'), 0) as custo
    from motoboys m
    left join rotas r on r.motoboy_id = m.id
      and (${de}::date is null or r.data >= ${de}::date)
      and (${ate}::date is null or r.data <= ${ate}::date)
    group by m.id, m.nome
    order by quentinhas desc
  `;

  const porLocal = await sql`
    select
      l.id, l.nome,
      coalesce(sum(r.quantidade) filter (where r.status = 'entregue'), 0) as quentinhas,
      coalesce(sum(r.receita) filter (where r.status = 'entregue'), 0) as receita
    from locais l
    left join rotas r on r.local_id = l.id
      and (${de}::date is null or r.data >= ${de}::date)
      and (${ate}::date is null or r.data <= ${ate}::date)
    group by l.id, l.nome
    order by quentinhas desc
  `;

  const [financeiro] = await sql`
    select
      coalesce(sum(receita) filter (where status = 'entregue'), 0) as receita_total,
      coalesce(sum(custo) filter (where status = 'entregue'), 0) as custo_total
    from rotas
    where (${de}::date is null or data >= ${de}::date)
      and (${ate}::date is null or data <= ${ate}::date)
  `;

  // Rotas individuais entregues no período para detalhamento ao clicar no motoboy
  const rotasDetalhadas = await sql`
    select
      r.id, r.data, r.quantidade, r.status, r.receita, r.custo, r.entregue_em,
      r.motoboy_id, m.nome as motoboy_nome,
      r.local_id, l.nome as local_nome
    from rotas r
    join locais l on l.id = r.local_id
    join motoboys m on m.id = r.motoboy_id
    where (${de}::date is null or r.data >= ${de}::date)
      and (${ate}::date is null or r.data <= ${ate}::date)
      and r.status = 'entregue'
    order by r.data desc, r.entregue_em desc, r.id desc
  `;

  return NextResponse.json({
    por_motoboy: porMotoboy,
    por_local: porLocal,
    rotas_detalhadas: rotasDetalhadas,
    financeiro: {
      receita: Number(financeiro?.receita_total || 0),
      custo: Number(financeiro?.custo_total || 0),
      saldo: Number(financeiro?.receita_total || 0) - Number(financeiro?.custo_total || 0),
    },
  });
}
