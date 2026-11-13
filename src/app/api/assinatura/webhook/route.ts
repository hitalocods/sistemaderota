import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { calcularProximoVencimento } from "@/lib/assinatura";

export const dynamic = "force-dynamic";

/**
 * Webhook unificado para confirmação de pagamento e renovação de licença
 * Suporta AbacatePay (event: billing.paid) e PagBank (charges.paid / PAID)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let data: any = {};
    try {
      data = JSON.parse(rawBody);
    } catch {
      const params = new URLSearchParams(rawBody);
      data = Object.fromEntries(params.entries());
    }

    console.log("[Assinatura Webhook] Notificação recebida:", JSON.stringify(data, null, 2));

    // Identificação de eventos AbacatePay ou PagBank
    const eventName = String(data?.event || "").toLowerCase();
    const rawBillStatus = String(
      data?.data?.status ||
      data?.status ||
      data?.charges?.[0]?.status ||
      ""
    ).toUpperCase();
    const transacaoId = data?.data?.id || data?.id || data?.charges?.[0]?.id;

    // AbacatePay: transparent.completed, checkout.completed, billing.paid ou status PAID / COMPLETED
    // PagBank: charges[0].status === 'PAID' ou status === 'PAID'
    const isPago =
      eventName === "transparent.completed" ||
      eventName === "checkout.completed" ||
      eventName === "billing.paid" ||
      eventName === "charges.paid" ||
      eventName === "subscription.paid" ||
      eventName.endsWith(".completed") ||
      eventName.endsWith(".paid") ||
      rawBillStatus === "PAID" ||
      rawBillStatus === "COMPLETED" ||
      rawBillStatus === "AUTHORIZED";

    const isFalha =
      eventName === "transparent.refunded" ||
      eventName === "transparent.disputed" ||
      eventName === "transparent.lost" ||
      eventName === "billing.failed" ||
      eventName === "billing.refunded" ||
      eventName === "checkout.expired" ||
      eventName === "charges.failed" ||
      rawBillStatus === "DECLINED" ||
      rawBillStatus === "CANCELED" ||
      rawBillStatus === "EXPIRED" ||
      rawBillStatus === "REFUNDED";

    if (isPago) {
      // Busca a assinatura atual para calcular o próximo vencimento baseado no dia 15
      const rows = await sql`
        select id, vence_em, dia_vencimento from assinaturas order by id asc limit 1
      `;
      const assinaturaAtual = rows[0];
      const proximoVencimento = calcularProximoVencimento(
        assinaturaAtual?.vence_em,
        assinaturaAtual?.dia_vencimento || 15
      );

      // Renova a licença com vencimento fixado no dia 15
      await sql`
        update assinaturas
        set 
          status = 'ativo',
          pagbank_id = coalesce(${transacaoId ?? null}, pagbank_id),
          pago_em = now(),
          vence_em = ${proximoVencimento}::timestamptz,
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;
      console.log(`[Assinatura Webhook] Pagamento Aprovado (${transacaoId || "sem id"})! Sistema liberado e renovado até ${proximoVencimento}.`);
    } else if (isFalha) {
      await sql`
        update assinaturas
        set 
          status = 'pendente',
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;
      console.log("[Assinatura Webhook] Status atualizado para pendente.");
    }

    return NextResponse.json({ received: true, status: rawBillStatus || eventName });
  } catch (error) {
    console.error("[Assinatura Webhook] Erro ao processar notificação:", error);
    return NextResponse.json({ received: true, error: "Erro interno no processamento" });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint de Webhook para Renovação de Assinatura (AbacatePay & PagBank)",
    metodo_esperado: "POST",
  });
}
