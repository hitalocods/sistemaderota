import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// PUT /api/grupos/[id]
// Body: { nome?: string, local_ids?: number[] }
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { nome, local_ids } = await req.json();

    // Atualiza nome se fornecido
    if (nome && nome.trim()) {
      await sql`
        update grupos_cobranca
        set nome = ${nome.trim()}
        where id = ${id}
      `;
    }

    // Substitui a lista de locais se fornecida
    if (Array.isArray(local_ids)) {
      // Remove todos os vínculos atuais
      await sql`delete from grupos_cobranca_locais where grupo_id = ${id}`;

      // Insere os novos vínculos
      for (const localId of local_ids) {
        await sql`
          insert into grupos_cobranca_locais (grupo_id, local_id)
          values (${id}, ${localId})
          on conflict do nothing
        `;
      }
    }

    // Retorna o grupo atualizado com seus locais
    const [grupo] = await sql`
      select
        g.id, g.nome, g.criado_em,
        coalesce(
          json_agg(
            json_build_object('id', l.id, 'nome', l.nome, 'valor_unidade', l.valor_unidade)
            order by l.nome
          ) filter (where l.id is not null),
          '[]'
        ) as locais
      from grupos_cobranca g
      left join grupos_cobranca_locais gcl on gcl.grupo_id = g.id
      left join locais l on l.id = gcl.local_id
      where g.id = ${id}
      group by g.id, g.nome, g.criado_em
    `;

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
    }

    return NextResponse.json(grupo);
  } catch (error) {
    console.error("Erro ao atualizar grupo:", error);
    return NextResponse.json({ error: "Falha ao atualizar grupo" }, { status: 500 });
  }
}

// DELETE /api/grupos/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await sql`delete from grupos_cobranca where id = ${id}`;

    return NextResponse.json({ mensagem: "Grupo removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover grupo:", error);
    return NextResponse.json({ error: "Falha ao remover grupo" }, { status: 500 });
  }
}
