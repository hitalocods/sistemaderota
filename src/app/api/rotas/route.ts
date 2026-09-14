import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deParam = searchParams.get("de");
    const ateParam = searchParams.get("ate");
    const motoboyIdParam = searchParams.get("motoboy_id");

    const de = deParam && deParam.trim() !== "" ? deParam.trim() : null;
    const ate = ateParam && ateParam.trim() !== "" ? ateParam.trim() : null;
    const motoboyId =
      motoboyIdParam && motoboyIdParam.trim() !== "" && !isNaN(Number(motoboyIdParam))
        ? Number(motoboyIdParam)
        : null;

    const rotas = await sql`
      select
        r.id, r.data, r.quantidade, r.status, r.receita, r.custo,
        r.criado_em, r.entregue_em,
        l.id as local_id, coalesce(l.nome, 'Local arquivado') as local_nome, 
        l.cliente_nome as local_cliente_nome, l.endereco_link as local_endereco_link,
        l.endereco as local_endereco, l.contato as local_contato,
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
  } catch (error) {
    console.error("Erro ao listar rotas:", error);
    return NextResponse.json({ error: "Falha ao carregar rotas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const dataFinal =
      data && typeof data === "string" && data.trim() !== ""
        ? data.trim()
        : new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

    const [rota] = await sql`
      insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo)
      values (${local_id}, ${motoboy_id}, ${quantidade}, ${dataFinal}, ${receita}, ${custo})
      returning *
    `;

    return NextResponse.json(rota, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar rota:", error);
    return NextResponse.json({ error: "Falha ao registrar rota" }, { status: 500 });
  }
}
