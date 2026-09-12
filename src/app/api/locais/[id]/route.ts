import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { nome, endereco, contato, valor_unidade, ativo } = await req.json();

  const [local] = await sql`
    update locais set
      nome = coalesce(${nome}, nome),
      endereco = coalesce(${endereco}, endereco),
      contato = coalesce(${contato}, contato),
      valor_unidade = coalesce(${valor_unidade}, valor_unidade),
      ativo = coalesce(${ativo}, ativo)
    where id = ${params.id}
    returning *
  `;

  if (!local) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  return NextResponse.json(local);
}

// Excluir local:
// 1. Se estiver ativo -> inativa (status INATIVO)
// 2. Se já estiver inativo -> remove da visualização/página (mantendo histórico financeiro se houver rotas)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [local] = await sql`
    select id, nome, ativo, coalesce(excluido, false) as excluido
    from locais
    where id = ${params.id}
  `;

  if (!local) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  // 1º passo: se estiver ATIVO, inativa primeiro
  if (local.ativo) {
    await sql`
      update locais set ativo = false where id = ${params.id}
    `;
    return NextResponse.json({
      ok: true,
      tipo: "desativado",
      mensagem: `Local "${local.nome}" inativado com sucesso.`,
    });
  }

  // 2º passo: se já estiver INATIVO, remove da página
  const [rotasCount] = await sql`
    select count(*) as count from rotas where local_id = ${params.id}
  `;

  if (Number(rotasCount?.count) > 0) {
    // Possui rotas: oculta da listagem (excluido = true) para preservar histórico financeiro
    await sql`
      update locais set excluido = true where id = ${params.id}
    `;
    return NextResponse.json({
      ok: true,
      tipo: "removido",
      mensagem: `Local "${local.nome}" removido da página com sucesso!`,
    });
  }

  // Sem rotas associadas: exclusão física do banco
  await sql`
    delete from locais where id = ${params.id}
  `;

  return NextResponse.json({
    ok: true,
    tipo: "excluido",
    mensagem: `Local "${local.nome}" excluído definitivamente.`,
  });
}

