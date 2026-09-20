import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const motoboyId = Number(params.id);
    if (!motoboyId || isNaN(motoboyId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    const locais = await sql`
      select
        ml.id,
        ml.local_id,
        ml.ordem,
        ml.qtd_padrao,
        ml.ativo,
        ml.criado_em,
        l.nome as local_nome,
        l.cliente_nome as local_cliente_nome,
        l.endereco as local_endereco,
        l.endereco_link as local_endereco_link,
        l.contato as local_contato,
        l.valor_unidade as local_valor_unidade,
        l.ativo as local_ativo
      from motoboy_locais ml
      inner join locais l on l.id = ml.local_id
      where ml.motoboy_id = ${motoboyId}
        and coalesce(l.excluido, false) = false
      order by ml.ordem asc, ml.criado_em asc
    `;
    return NextResponse.json(locais);
  } catch (error) {
    console.error("Erro ao listar carteira:", error);
    return NextResponse.json({ error: "Falha ao carregar carteira" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const motoboyId = Number(params.id);
    if (!motoboyId || isNaN(motoboyId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    const { local_id, qtd_padrao } = await req.json();
    if (!local_id) {
      return NextResponse.json({ error: "local_id e obrigatorio" }, { status: 400 });
    }
    const [existente] = await sql`
      select id from motoboy_locais
      where motoboy_id = ${motoboyId} and local_id = ${local_id}
    `;
    if (existente) {
      return NextResponse.json({ error: "Este local ja esta na carteira" }, { status: 409 });
    }
    const [maxOrdem] = await sql`
      select coalesce(max(ordem), 0) as max_ordem
      from motoboy_locais
      where motoboy_id = ${motoboyId}
    `;
    const proximaOrdem = Number(maxOrdem.max_ordem) + 1;
    const qtd = qtd_padrao && Number(qtd_padrao) > 0 ? Number(qtd_padrao) : 30;
    const [item] = await sql`
      insert into motoboy_locais (motoboy_id, local_id, ordem, qtd_padrao)
      values (${motoboyId}, ${local_id}, ${proximaOrdem}, ${qtd})
      returning *
    `;

    // Se hoje já houver rotas em andamento, adiciona a rota de hoje para esse local
    try {
      const hojeStr = new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
      const [rotasHoje] = await sql`
        select count(*)::int as total from rotas where data = ${hojeStr}::date
      `;
      if (rotasHoje && Number(rotasHoje.total) > 0) {
        const [localInfo] = await sql`select valor_unidade from locais where id = ${local_id}`;
        const [motoInfo] = await sql`select valor_rota from motoboys where id = ${motoboyId}`;
        if (localInfo && motoInfo) {
          const receita = Number(localInfo.valor_unidade) * qtd;
          const custo = Number(motoInfo.valor_rota);
          await sql`
            insert into rotas (local_id, motoboy_id, quantidade, data, receita, custo, status)
            select ${local_id}, ${motoboyId}, ${qtd}, ${hojeStr}::date, ${receita}, ${custo}, 'pendente'
            where not exists (
              select 1 from rotas where local_id = ${local_id} and motoboy_id = ${motoboyId} and data = ${hojeStr}::date
            )
          `;
        }
      }
    } catch (e) {
      console.error("Erro ao sincronizar rota de hoje:", e);
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar local:", error);
    return NextResponse.json({ error: "Falha ao adicionar local" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const motoboyId = Number(params.id);
    const { local_id } = await req.json();
    if (!motoboyId || !local_id) {
      return NextResponse.json({ error: "Dados obrigatorios ausentes" }, { status: 400 });
    }
    const [removido] = await sql`
      delete from motoboy_locais
      where motoboy_id = ${motoboyId} and local_id = ${local_id}
      returning *
    `;
    if (!removido) {
      return NextResponse.json({ error: "Local nao encontrado na carteira" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover local:", error);
    return NextResponse.json({ error: "Falha ao remover local" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const motoboyId = Number(params.id);
    const { local_id, qtd_padrao } = await req.json();
    if (!motoboyId || !local_id || qtd_padrao === undefined) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    const qtd = Number(qtd_padrao);
    if (isNaN(qtd) || qtd <= 0) {
      return NextResponse.json({ error: "Quantidade deve ser maior que zero" }, { status: 400 });
    }
    const [atualizado] = await sql`
      update motoboy_locais
      set qtd_padrao = ${qtd}
      where motoboy_id = ${motoboyId} and local_id = ${local_id}
      returning *
    `;
    if (!atualizado) {
      return NextResponse.json({ error: "Local nao encontrado na carteira" }, { status: 404 });
    }
    return NextResponse.json(atualizado);
  } catch (error) {
    console.error("Erro ao atualizar qtd:", error);
    return NextResponse.json({ error: "Falha ao atualizar quantidade" }, { status: 500 });
  }
}