import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await sql`
      select * from assinaturas order by id asc limit 1
    `;

    if (rows.length === 0) {
      // Cria registro padrão de 30 dias se ainda não existir
      const inserted = await sql`
        insert into assinaturas (cliente_nome, valor_mensal, status, vence_em)
        values ('Dona Rê', 85.00, 'ativo', now() + interval '30 days')
        returning *
      `;
      return NextResponse.json({ assinatura: formatarAssinatura(inserted[0]) });
    }

    const assinatura = formatarAssinatura(rows[0]);
    return NextResponse.json({ assinatura });
  } catch (error) {
    console.error("Erro ao carregar status da assinatura:", error);
    return NextResponse.json(
      { error: "Falha ao consultar licença do sistema" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { link_pagamento, dias_tolerancia, valor_mensal, status } = body;

    const rows = await sql`
      update assinaturas
      set 
        link_pagamento = coalesce(${link_pagamento ?? null}, link_pagamento),
        dias_tolerancia = coalesce(${dias_tolerancia ? Number(dias_tolerancia) : null}, dias_tolerancia),
        valor_mensal = coalesce(${valor_mensal ? Number(valor_mensal) : null}, valor_mensal),
        status = coalesce(${status ?? null}, status),
        atualizado_em = now()
      where id = (select id from assinaturas order by id asc limit 1)
      returning *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assinatura: formatarAssinatura(rows[0]),
    });
  } catch (error) {
    console.error("Erro ao atualizar assinatura:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar configurações de assinatura" },
      { status: 500 }
    );
  }
}

// Helper para calcular prazos e status de bloqueio
function formatarAssinatura(row: any) {
  const agora = new Date();
  const venceEm = new Date(row.vence_em);
  // Regra solicitada: travar caso passe 1 dia do pagamento/vencimento
  const diasTolerancia = Number(row.dias_tolerancia ?? 1);
  
  // Limite com tolerância (ex: venceEm + 1 dia)
  const limiteTolerancia = new Date(venceEm.getTime() + diasTolerancia * 24 * 60 * 60 * 1000);
  
  const diferencaMs = venceEm.getTime() - agora.getTime();
  const diasRestantes = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));
  
  // Bloqueado se ultrapassar a data de vencimento + 1 dia de tolerância
  const expirado = agora > limiteTolerancia;
  const emTolerancia = agora > venceEm && agora <= limiteTolerancia;

  let statusCalculado = row.status;
  if (expirado) {
    statusCalculado = "bloqueado";
  } else if (emTolerancia) {
    statusCalculado = "pendente";
  }

  const linkPagamento =
    row.link_pagamento ||
    process.env.ABACATEPAY_CHECKOUT_URL ||
    null;

  return {
    id: row.id,
    cliente_nome: row.cliente_nome,
    valor_mensal: Number(row.valor_mensal || 85.0),
    status: statusCalculado,
    bloqueado: expirado,
    em_tolerancia: emTolerancia,
    dias_restantes: diasRestantes,
    dias_tolerancia: diasTolerancia,
    vence_em: row.vence_em,
    pago_em: row.pago_em,
    link_pagamento: linkPagamento,
  };
}
