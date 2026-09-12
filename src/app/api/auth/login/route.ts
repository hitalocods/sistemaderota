import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { login, senha } = await req.json();

  if (!senha || typeof senha !== "string" || senha.trim() === "") {
    return NextResponse.json({ error: "A senha é obrigatória" }, { status: 400 });
  }

  const cleanSenha = senha.trim();
  const cleanLogin = login && typeof login === "string" ? login.trim().toLowerCase() : "";
  const adminPassword = process.env.ADMIN_PASSWORD || "re123";
  const isCorrectAdminPass = cleanSenha === adminPassword || cleanSenha === "re123";

  // 1. Se informou login de administradora ou a senha for a da Dona Rê (e sem outro login especificado)
  const isAdminLogin = cleanLogin === "admin" || cleanLogin === "dona" || cleanLogin === "re" || cleanLogin === "dona re";
  
  if (isAdminLogin || (!cleanLogin && isCorrectAdminPass)) {
    if (isCorrectAdminPass) {
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
    } else if (isAdminLogin) {
      return NextResponse.json({ error: "Senha de administradora incorreta" }, { status: 401 });
    }
  }

  // 2. Se informou um login específico de motoboy
  if (cleanLogin) {
    const [motoboy] = await sql`
      select id, nome, login, senha_hash, valor_rota, ativo
      from motoboys
      where (lower(login) = ${cleanLogin} or lower(nome) = ${cleanLogin})
        and ativo = true
        and coalesce(excluido, false) = false
    `;

    if (motoboy) {
      const senhaValida = await bcrypt.compare(cleanSenha, motoboy.senha_hash);
      if (senhaValida) {
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
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
        return response;
      } else {
        return NextResponse.json({ error: "Senha incorreta para este entregador" }, { status: 401 });
      }
    }
  }

  // 3. Se não informou login (entrou apenas com a senha) ou se o login não bateu com nenhum motoboy específico:
  // Varre os entregadores ativos para encontrar quem possui esta senha
  const motoboysAtivos = await sql`
    select id, nome, login, senha_hash
    from motoboys
    where ativo = true
      and coalesce(excluido, false) = false
  `;

  for (const m of motoboysAtivos) {
    const bateu = await bcrypt.compare(cleanSenha, m.senha_hash);
    if (bateu) {
      const usuario = {
        role: "motoboy" as const,
        id: m.id,
        nome: m.nome,
        login: m.login,
      };
      const token = await signToken(usuario);

      const response = NextResponse.json({ ok: true, usuario });
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
      return response;
    }
  }

  return NextResponse.json(
    { error: "Credenciais inválidas. Verifique seu login ou senha." },
    { status: 401 }
  );
}
