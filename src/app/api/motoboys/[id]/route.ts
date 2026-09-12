import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { nome, login, senha, valor_rota, ativo } = await req.json();
  const senha_hash = senha ? await bcrypt.hash(senha, 10) : null;

  const [motoboy] = await sql`
    update motoboys set
      nome = coalesce(${nome}, nome),
      login = coalesce(${login}, login),
      senha_hash = coalesce(${senha_hash}, senha_hash),
      valor_rota = coalesce(${valor_rota}, valor_rota),
      ativo = coalesce(${ativo}, ativo)
    where id = ${params.id}
    returning id, nome, login, valor_rota, ativo, criado_em
  `;

  if (!motoboy) {
    return NextResponse.json({ error: "Motoboy não encontrado" }, { status: 404 });
  }

  return NextResponse.json(motoboy);
}

// Excluir motoboy:
// 1. Se estiver ativo -> inativa (status INATIVO)
// 2. Se já estiver inativo -> remove da visualização/página (mantendo histórico financeiro se houver rotas)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [motoboy] = await sql`
    select id, nome, ativo, coalesce(excluido, false) as excluido
    from motoboys
    where id = ${params.id}
  `;

  if (!motoboy) {
    return NextResponse.json({ error: "Motoboy não encontrado" }, { status: 404 });
  }

  // 1º passo: se estiver ATIVO, inativa primeiro
  if (motoboy.ativo) {
    await sql`
      update motoboys set ativo = false where id = ${params.id}
    `;
    return NextResponse.json({
      ok: true,
      tipo: "desativado",
      mensagem: `Motoboy "${motoboy.nome}" inativado com sucesso.`,
    });
  }

  // 2º passo: se já estiver INATIVO, remove da página
  const [rotasCount] = await sql`
    select count(*) as count from rotas where motoboy_id = ${params.id}
  `;

  if (Number(rotasCount?.count) > 0) {
    // Possui rotas: oculta da listagem (excluido = true) para preservar histórico financeiro
    await sql`
      update motoboys set excluido = true where id = ${params.id}
    `;
    return NextResponse.json({
      ok: true,
      tipo: "removido",
      mensagem: `Motoboy "${motoboy.nome}" removido da página com sucesso!`,
    });
  }

  // Sem rotas associadas: pode excluir do banco
  await sql`
    delete from motoboys where id = ${params.id}
  `;

  return NextResponse.json({
    ok: true,
    tipo: "excluido",
    mensagem: `Motoboy "${motoboy.nome}" excluído definitivamente.`,
  });
}

