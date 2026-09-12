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

// Excluir local: se tiver rotas associadas, apenas desativa (soft delete) para manter integridade; se não tiver, exclui do banco
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // Verificar se tem rotas vinculadas
  const [rotasCount] = await sql`
    select count(*) as count from rotas where local_id = ${params.id}
  `;

  if (Number(rotasCount?.count) > 0) {
    // Possui rotas: desativação segura
    await sql`
      update locais set ativo = false where id = ${params.id}
    `;
    return NextResponse.json({
      ok: true,
      tipo: "desativado",
      mensagem: "Local desativado com sucesso (histórico de rotas preservado).",
    });
  }

  // Não possui rotas: exclusão física permitida
  const [localDeletado] = await sql`
    delete from locais where id = ${params.id} returning id
  `;

  if (!localDeletado) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    tipo: "excluido",
    mensagem: "Local excluído permanentemente com sucesso.",
  });
}

