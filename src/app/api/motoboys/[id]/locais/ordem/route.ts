import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// PUT /api/motoboys/[id]/locais/ordem
// Salva nova ordem apos drag-and-drop
// Body: { ordem: [{ local_id: number, ordem: number }, ...] }
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const motoboyId = Number(params.id);
    if (!motoboyId || isNaN(motoboyId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const { ordem } = await req.json();

    if (!Array.isArray(ordem) || ordem.length === 0) {
      return NextResponse.json({ error: "Lista de ordem invalida" }, { status: 400 });
    }

    // Atualizar cada item individualmente para garantir atomicidade simples
    for (const item of ordem) {
      const localId = Number(item.local_id);
      const novaOrdem = Number(item.ordem);

      if (!localId || isNaN(novaOrdem)) continue;

      await sql`
        update motoboy_locais
        set ordem = ${novaOrdem}
        where motoboy_id = ${motoboyId} and local_id = ${localId}
      `;
    }

    return NextResponse.json({ ok: true, atualizados: ordem.length });
  } catch (error) {
    console.error("Erro ao salvar ordem da carteira:", error);
    return NextResponse.json({ error: "Falha ao salvar ordem" }, { status: 500 });
  }
}