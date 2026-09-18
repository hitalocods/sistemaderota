import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/grupos
// Retorna todos os grupos com a lista de locais vinculados a cada um
export async function GET() {
  try {
    const grupos = await sql`
      select
        g.id,
        g.nome,
        g.criado_em,
        coalesce(
          json_agg(
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cliente_nome', l.cliente_nome,
              'valor_unidade', l.valor_unidade,
              'ativo', l.ativo
            ) order by l.nome
          ) filter (where l.id is not null),
          '[]'
        ) as locais
      from grupos_cobranca g
      left join grupos_cobranca_locais gcl on gcl.grupo_id = g.id
      left join locais l on l.id = gcl.local_id
      group by g.id, g.nome, g.criado_em
      order by g.nome asc
    `;

    return NextResponse.json(grupos);
  } catch (error) {
    console.error("Erro ao listar grupos:", error);
    return NextResponse.json({ error: "Falha ao carregar grupos" }, { status: 500 });
  }
}

// POST /api/grupos
// Body: { nome: string, local_ids: number[] }
export async function POST(req: Request) {
  try {
    const { nome, local_ids = [] } = await req.json();

    if (!nome || !nome.trim()) {
      return NextResponse.json({ error: "Nome do grupo é obrigatório" }, { status: 400 });
    }

    // Criar o grupo
    const [grupo] = await sql`
      insert into grupos_cobranca (nome)
      values (${nome.trim()})
      returning *
    `;

    // Vincular locais se informados
    if (Array.isArray(local_ids) && local_ids.length > 0) {
      for (const localId of local_ids) {
        await sql`
          insert into grupos_cobranca_locais (grupo_id, local_id)
          values (${grupo.id}, ${localId})
          on conflict do nothing
        `;
      }
    }

    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    return NextResponse.json({ error: "Falha ao criar grupo" }, { status: 500 });
  }
}
