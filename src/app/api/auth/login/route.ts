import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { tipo, login, senha } = await req.json();

  if (!senha) {
    return NextResponse.json({ error: "A senha é obrigatória" }, { status: 400 });
  }

  // 1. Login de Administrador (Dona Rê)
  if (tipo === "admin") {
    const adminPassword = process.env.ADMIN_PASSWORD || "re123";
    if (senha !== adminPassword) {
      return NextResponse.json({ error: "Senha de administradora incorreta" }, { status: 401 });
    }

    const usuario = { role: "admin" as const, nome: "Dona Rê" };
    const token = await signToken(usuario);

    const response = NextResponse.json({ ok: true, usuario });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 dias
      path: "/",
    });

    return response;
  }

  // 2. Login de Motoboy
  if (tipo === "motoboy") {
    if (!login) {
      return NextResponse.json({ error: "Login é obrigatório" }, { status: 400 });
    }

    const [motoboy] = await sql`
      select id, nome, login, senha_hash, valor_rota, ativo
      from motoboys
      where lower(login) = lower(${login.trim()})
    `;

    if (!motoboy || !motoboy.ativo) {
      return NextResponse.json({ error: "Entregador não encontrado ou inativo" }, { status: 401 });
    }

    const senhaValida = await bcrypt.compare(senha, motoboy.senha_hash);
    if (!senhaValida) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const usuario = {
      role: "motoboy" as const,
      id: motoboy.id,
      nome: motoboy.nome,
      login: motoboy.login,
    };
    const token = await signToken(usuario);

    const response = NextResponse.json({ ok: true, usuario });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 dias
      path: "/",
    });

    return response;
  }

  return NextResponse.json({ error: "Tipo de login inválido" }, { status: 400 });
}
