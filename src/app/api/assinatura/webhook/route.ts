import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Webhook oficial para receber notificações de pagamento e renovação de assinatura do PagBank
 * Documentação PagBank: Notificações de Cobrança / Assinaturas
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let data: any = {};
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Se vier como Form URL Encoded (comum em notificações antigas de notificationCode)
      const params = new URLSearchParams(rawBody);
      data = Object.fromEntries(params.entries());
    }

    console.log("[PagBank Webhook] Notificação recebida:", JSON.stringify(data, null, 2));

    // Identifica o status do evento PagBank
    // PagBank v4/v5 usa charges[].status == 'PAID' ou status == 'PAID' ou subscription.status == 'ACTIVE'
    const statusCharge = data?.charges?.[0]?.status || data?.status || data?.event;
    const pagbankId = data?.id || data?.charges?.[0]?.id || data?.subscription_id;

    const isPago =
      statusCharge === "PAID" ||
      statusCharge === "AUTHORIZED" ||
      statusCharge === "charges.paid" ||
      statusCharge === "subscription.paid";

    const isFalha =
      statusCharge === "DECLINED" ||
      statusCharge === "CANCELED" ||
      statusCharge === "charges.failed";

    if (isPago) {
      // Renova por mais 30 dias a partir de agora (ou soma 30 dias ao vencimento atual se ainda não expirou)
      await sql`
        update assinaturas
        set 
          status = 'ativo',
          pagbank_id = coalesce(${pagbankId ?? null}, pagbank_id),
          pago_em = now(),
          vence_em = case 
            when vence_em > now() then vence_em + interval '30 days'
            else now() + interval '30 days'
          end,
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;
      console.log("[PagBank Webhook] Pagamento aprovado! Assinatura renovada por +30 dias.");
    } else if (isFalha) {
      await sql`
        update assinaturas
        set 
          status = 'pendente',
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;
      console.log("[PagBank Webhook] Pagamento com falha/cancelado. Status atualizado para pendente.");
    }

    // O PagBank exige resposta HTTP 200 para confirmar recebimento
    return NextResponse.json({ received: true, status: statusCharge });
  } catch (error) {
    console.error("[PagBank Webhook] Erro ao processar webhook:", error);
    // Retorna 200 com erro logado para evitar retentativas infinitas caso o payload tenha formato inesperado
    return NextResponse.json({ received: true, error: "Erro interno no processamento" });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint de Webhook PagBank para Assinatura do Sistema Quentinhas da Rê",
    metodo_esperado: "POST",
  });
}
