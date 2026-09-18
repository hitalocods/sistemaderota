import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/relatorios?de=2026-09-01&ate=2026-09-07
// Considera apenas rotas com status 'entregue' nas somas de quentinhas/receita.
// GET /api/relatorios?tipo=cobranca&locais=1,2,3&de=...&ate=...
// Retorna totais de quentinhas e receita por local para comprovante de cobrança.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const deParam = searchParams.get("de");
  const ateParam = searchParams.get("ate");

  // ── MODO COBRANÇA POR GRUPO ───────────────────────────────────────────────
  if (tipo === "cobranca") {
    const grupoIdParam = searchParams.get("grupo_id");
    const grupoId = grupoIdParam ? parseInt(grupoIdParam, 10) : null;

    if (!grupoId || isNaN(grupoId)) {
      return NextResponse.json({ error: "Informe o grupo_id" }, { status: 400 });
    }

    const de = deParam && deParam.trim() !== "" ? deParam.trim() : null;
    const ate = ateParam && ateParam.trim() !== "" ? ateParam.trim() : null;

    // Buscar locais do grupo
    const locaisDoGrupo = await sql`
      select local_id from grupos_cobranca_locais where grupo_id = ${grupoId}
    `;
    const localIds = locaisDoGrupo.map((r: Record<string, number>) => r.local_id);

    if (localIds.length === 0) {
      return NextResponse.json({ itens: [], grupo_vazio: true });
    }

    const itens = await sql`
      select
        l.id,
        l.nome,
        l.cliente_nome,
        l.valor_unidade,
        coalesce(sum(r.quantidade) filter (where r.status = 'entregue'), 0) as quentinhas,
        coalesce(sum(r.receita)   filter (where r.status = 'entregue'), 0) as receita
      from locais l
      left join rotas r on r.local_id = l.id
        and (${de}::date is null or r.data >= ${de}::date)
        and (${ate}::date is null or r.data <= ${ate}::date)
      where l.id = any(${localIds}::int[])
      group by l.id, l.nome, l.cliente_nome, l.valor_unidade
      order by l.nome asc
    `;

    return NextResponse.json({ itens });
  }

  // ── MODO RELATÓRIO GERAL (padrão) ─────────────────────────────────────────

  const de = deParam && deParam.trim() !== "" ? deParam.trim() : null;
  const ate = ateParam && ateParam.trim() !== "" ? ateParam.trim() : null;

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
    group by m.id, m.nome, m.ativo, m.excluido
    having count(r.id) filter (where r.status = 'entregue') > 0
        or (m.ativo = true and coalesce(m.excluido, false) = false)
    order by quentinhas desc, m.nome asc
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
    group by l.id, l.nome, l.ativo, l.excluido
    having coalesce(sum(r.quantidade) filter (where r.status = 'entregue'), 0) > 0
        or (l.ativo = true and coalesce(l.excluido, false) = false)
    order by quentinhas desc, l.nome asc
  `;

  const [financeiro] = await sql`
    select
      coalesce(sum(quantidade) filter (where status = 'entregue'), 0) as quentinhas_total,
      count(id) filter (where status = 'entregue') as rotas_total,
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
      r.motoboy_id, coalesce(m.nome, 'Motoboy arquivado') as motoboy_nome,
      r.local_id, coalesce(l.nome, 'Local arquivado') as local_nome
    from rotas r
    left join locais l on l.id = r.local_id
    left join motoboys m on m.id = r.motoboy_id
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
      quentinhas_total: Number(financeiro?.quentinhas_total || 0),
      rotas_total: Number(financeiro?.rotas_total || 0),
      receita: Number(financeiro?.receita_total || 0),
      custo: Number(financeiro?.custo_total || 0),
      saldo: Number(financeiro?.receita_total || 0) - Number(financeiro?.custo_total || 0),
    },
  });
}
