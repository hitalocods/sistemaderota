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

// Excluir motoboy: se tiver rotas associadas, desativa para preservar histórico; se não tiver, exclui permanentemente
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // Checar se existem rotas deste motoboy
  const [rotasCount] = await sql`
    select count(*) as count from rotas where motoboy_id = ${params.id}
  `;

  if (Number(rotasCount?.count) > 0) {
    // Possui rotas no histórico: desativação segura
    await sql`
      update motoboys set ativo = false where id = ${params.id}
    `;
    return NextResponse.json({
      ok: true,
      tipo: "desativado",
      mensagem: "Motoboy desativado com sucesso (histórico de rotas mantido).",
    });
  }

  // Não possui rotas: exclusão física permitida
  const [motoboyDeletado] = await sql`
    delete from motoboys where id = ${params.id} returning id
  `;

  if (!motoboyDeletado) {
    return NextResponse.json({ error: "Motoboy não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    tipo: "excluido",
    mensagem: "Motoboy excluído permanentemente com sucesso.",
  });
}

