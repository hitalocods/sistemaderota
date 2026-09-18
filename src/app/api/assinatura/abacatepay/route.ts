import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Busca a assinatura ativa no banco
    const rows = await sql`
      select * from assinaturas order by id asc limit 1
    `;
    const assinatura = rows[0] || {
      valor_mensal: 85.0,
      cliente_nome: "Dona Rê",
    };

    const valorCentavos = Math.round(Number(assinatura.valor_mensal || 85.0) * 100);
    const apiKey = process.env.ABACATEPAY_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chave de API do AbacatePay não configurada nas variáveis de ambiente (ABACATEPAY_API_KEY).",
        },
        { status: 400 }
      );
    }

    // URL base da aplicação para redirecionamento após pagamento
    const appOrigin =
      req.headers.get("origin") ||
      req.headers.get("referer") ||
      process.env.NEXTAUTH_URL ||
      "https://quentinhasdare.vercel.app";

    const returnUrl = `${appOrigin}/?pagamento=sucesso`;
    const completionUrl = `${appOrigin}/?pagamento=concluido`;

    // 2. Chama a API oficial do AbacatePay
    const payload = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: "mensalidade-quentinhas-da-re",
          name: "Mensalidade Quentinhas da Rê",
          description: `Assinatura mensal do Sistema de Gestão de Rotas - ${assinatura.cliente_nome || "Dona Rê"}`,
          quantity: 1,
          price: valorCentavos,
        },
      ],
      returnUrl,
      completionUrl,
    };

    const res = await fetch("https://api.abacatepay.com/v1/billing/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.data?.url) {
      console.error("[AbacatePay] Erro na resposta:", data);
      const isInvalidKey =
        data?.error?.includes("Invalid or inactive API key") ||
        data?.error?.includes("unauthorized") ||
        data?.error?.includes("token");

      return NextResponse.json(
        {
          success: false,
          error: isInvalidKey
            ? "A chave da AbacatePay fornecida está inativa ou inválida na API. No painel da AbacatePay (Integrar > API Keys), copie sua chave de produção (começa com abc_prod_) ou de testes (abc_dev_)."
            : (data.error || "Não foi possível gerar a cobrança no AbacatePay."),
          rawError: data.error,
          isInvalidKey,
        },
        { status: 400 }
      );
    }

    // Salva o link da cobrança no banco para reutilização rápida
    if (data.data?.url) {
      await sql`
        update assinaturas
        set 
          link_pagamento = ${data.data.url},
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;
    }

    return NextResponse.json({
      success: true,
      url: data.data.url,
      billingId: data.data.id,
      valor: assinatura.valor_mensal || 85.0,
    });
  } catch (error: any) {
    console.error("[AbacatePay] Erro interno:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro de comunicação ao gerar cobrança no AbacatePay.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint para geração de cobrança AbacatePay (Pix R$ 85,00)",
  });
}
