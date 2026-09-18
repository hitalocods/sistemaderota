import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

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
    const eventName = data?.event || "";
    const billStatus = data?.data?.status || data?.status || data?.charges?.[0]?.status;
    const transacaoId = data?.data?.id || data?.id || data?.charges?.[0]?.id;

    // AbacatePay: event === 'billing.paid' ou data.status === 'PAID'
    // PagBank: charges[0].status === 'PAID' ou status === 'PAID'
    const isPago =
      eventName === "billing.paid" ||
      billStatus === "PAID" ||
      billStatus === "AUTHORIZED" ||
      eventName === "charges.paid" ||
      eventName === "subscription.paid";

    const isFalha =
      eventName === "billing.failed" ||
      eventName === "billing.refunded" ||
      billStatus === "DECLINED" ||
      billStatus === "CANCELED" ||
      eventName === "charges.failed";

    if (isPago) {
      // Renova a licença por mais 30 dias
      await sql`
        update assinaturas
        set 
          status = 'ativo',
          pagbank_id = coalesce(${transacaoId ?? null}, pagbank_id),
          pago_em = now(),
          vence_em = case 
            when vence_em > now() then vence_em + interval '30 days'
            else now() + interval '30 days'
          end,
          atualizado_em = now()
        where id = (select id from assinaturas order by id asc limit 1)
      `;
      console.log(`[Assinatura Webhook] Pagamento Aprovado (${transacaoId || "sem id"})! Sistema liberado e renovado por +30 dias.`);
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

    return NextResponse.json({ received: true, status: billStatus || eventName });
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
