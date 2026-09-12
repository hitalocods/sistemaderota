import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/rotas?de=2026-09-01&ate=2026-09-07&motoboy_id=3
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  const motoboyId = searchParams.get("motoboy_id");

  const rotas = await sql`
    select
      r.id, r.data, r.quantidade, r.status, r.receita, r.custo,
      r.entregue_em,
      l.id as local_id, coalesce(l.nome, 'Local arquivado') as local_nome, l.endereco as local_endereco,
      m.id as motoboy_id, coalesce(m.nome, 'Motoboy arquivado') as motoboy_nome, m.whatsapp as motoboy_whatsapp
    from rotas r
    left join locais l on l.id = r.local_id
    left join motoboys m on m.id = r.motoboy_id
    where (${de}::date is null or r.data >= ${de}::date)
      and (${ate}::date is null or r.data <= ${ate}::date)
      and (${motoboyId}::int is null or r.motoboy_id = ${motoboyId}::int)
    order by r.data desc, r.id desc
  `;

  return NextResponse.json(rotas);
}

export async function POST(req: Request) {
  const { local_id, motoboy_id, quantidade, data } = await req.json();

  if (!local_id || !motoboy_id || !quantidade) {
    return NextResponse.json(
      { error: "Local, motoboy e quantidade são obrigatórios" },
      { status: 400 }
    );
  }

  const [local] = await sql`select valor_unidade from locais where id = ${local_id}`;
  const [motoboy] = await sql`select valor_rota from motoboys where id = ${motoboy_id}`;

  if (!local || !motoboy) {
    return NextResponse.json({ error: "Local ou motoboy inválido" }, { status: 400 });
  }

  const receita = Number(local.valor_unidade) * Number(quantidade);
  const custo = Number(motoboy.valor_rota);

  const [rota] = await sql`
    insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo)
    values (${local_id}, ${motoboy_id}, ${quantidade}, ${data ?? new Date().toISOString().slice(0, 10)}, ${receita}, ${custo})
    returning *
  `;

  return NextResponse.json(rota, { status: 201 });
}
