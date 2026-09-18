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

    // 2. Criação direta do Pix transparente (retorna QR Code imagem + Copia e Cola instantâneo)
    const transparentRes = await fetch("https://api.abacatepay.com/v2/transparents/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "PIX",
        data: {
          amount: valorCentavos,
        },
      }),
    });

    const transparentData = await transparentRes.json();

    if (transparentData?.success && transparentData.data?.brCode) {
      const pixData = transparentData.data;

      // Salva o ID da cobrança para rastreio
      await sql`
        update assinaturas
        set 
          pagbank_id = ${pixData.id},
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;

      return NextResponse.json({
        success: true,
        tipo: "qrcode_direto",
        pix: {
          id: pixData.id,
          brCode: pixData.brCode,
          qrCodeImage: pixData.brCodeBase64,
          valor: (pixData.amount / 100).toFixed(2),
          expiresAt: pixData.expiresAt,
        },
      });
    }

    // Fallback caso a conta não tenha transparents ativo: gera link de checkout normal
    console.warn("[AbacatePay] Falha no transparents, tentando checkout fallback:", transparentData);
    const checkoutRes = await fetch("https://api.abacatepay.com/v2/checkouts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ id: "prod_rNAcqhMZ3gnUP0wZsLdX4qpf", quantity: 1 }],
        methods: ["PIX"],
      }),
    });
    const checkoutData = await checkoutRes.json();

    if (checkoutData?.success && checkoutData.data?.url) {
      return NextResponse.json({
        success: true,
        tipo: "link_checkout",
        url: checkoutData.data.url,
        billingId: checkoutData.data.id,
        valor: assinatura.valor_mensal || 85.0,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: transparentData?.error || checkoutData?.error || "Não foi possível gerar o Pix no momento.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[AbacatePay] Erro interno:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro de comunicação ao gerar Pix.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint para geração direta de QR Code Pix (R$ 85,00)",
  });
}
