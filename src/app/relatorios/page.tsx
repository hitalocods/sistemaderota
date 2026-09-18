"use client";

import React, { useEffect, useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
interface LocalInfo {
  id: number;
  nome: string;
  cliente_nome: string | null;
  valor_unidade: string | number;
  ativo: boolean;
}

interface GrupoCobranca {
  id: number;
  nome: string;
  locais: LocalInfo[];
}

interface RelatorioData {
  por_motoboy: Array<{
    id: number;
    nome: string;
    rotas: string | number;
    quentinhas: string | number;
    custo: string | number;
  }>;
  por_local: Array<{
    id: number;
    nome: string;
    quentinhas: string | number;
    receita: string | number;
  }>;
  rotas_detalhadas?: Array<{
    id: number;
    data: string;
    quantidade: number;
    status: string;
    receita: string | number;
    custo: string | number;
    entregue_em: string | null;
    motoboy_id: number;
    motoboy_nome: string;
    local_id: number;
    local_nome: string;
  }>;
  financeiro: {
    quentinhas_total?: number;
    rotas_total?: number;
    receita: number;
    custo: number;
    saldo: number;
  };
}

interface ComprovanteItem {
  id: number;
  nome: string;
  cliente_nome: string | null;
  valor_unidade: string | number;
  quentinhas: string | number;
  receita: string | number;
  qtd_editada: number;
}

interface ComprovanteDia {
  data: string;
  quentinhas: string | number;
  receita: string | number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function toLocalDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(s: string) {
  return s.split("-").reverse().join("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Página Principal
// ─────────────────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  // Auth
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Abas internas
  const [tab, setTab] = useState<"operacional" | "grupos" | "comprovante">("operacional");

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Dados base ──────────────────────────────────────────────────────────────
  const [locais, setLocais] = useState<LocalInfo[]>([]);
  const [grupos, setGrupos] = useState<GrupoCobranca[]>([]);

  // ── Relatório Operacional ───────────────────────────────────────────────────
  const [relTipo, setRelTipo] = useState<"hoje" | "dia" | "este_mes" | "mes" | "ano" | "tudo">("este_mes");
  const [relDia, setRelDia] = useState(toLocalDateStr());
  const [relMes, setRelMes] = useState(toLocalDateStr().slice(0, 7));
  const [relAno, setRelAno] = useState(String(new Date().getFullYear()));
  const [relDesc, setRelDesc] = useState("Este Mês");
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [relCarregando, setRelCarregando] = useState(false);
  const [motoboyExpandido, setMotoboyExpandido] = useState<number | null>(null);

  // ── Grupos de Cobrança ─────────────────────────────────────────────────────
  const [modalGrupoAberto, setModalGrupoAberto] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<GrupoCobranca | null>(null);
  const [grupoNome, setGrupoNome] = useState("");
  const [grupoLocalIds, setGrupoLocalIds] = useState<number[]>([]);
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [modalExcluirGrupo, setModalExcluirGrupo] = useState<GrupoCobranca | null>(null);
  const [excluindoGrupo, setExcluindoGrupo] = useState(false);

  // ── Comprovante ────────────────────────────────────────────────────────────
  const [cobGrupoId, setCobGrupoId] = useState<number | "">("");
  const [cobDe, setCobDe] = useState(toLocalDateStr());
  const [cobAte, setCobAte] = useState(toLocalDateStr());
  const [cobDados, setCobDados] = useState<ComprovanteItem[] | null>(null);
  const [cobPorDia, setCobPorDia] = useState<ComprovanteDia[]>([]);
  const [cobEditado, setCobEditado] = useState<{ [id: number]: number }>({});
  const [cobCarregando, setCobCarregando] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Verificação de auth
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.usuario?.role === "admin") {
          setIsAdmin(true);
        } else {
          window.location.href = "/";
        }
      } catch {
        window.location.href = "/";
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Carregamento de dados
  // ─────────────────────────────────────────────────────────────────────────
  async function carregarLocais() {
    try {
      const res = await fetch("/api/locais");
      if (res.ok) setLocais(await res.json());
    } catch { /* silencioso */ }
  }

  async function carregarGrupos() {
    try {
      const res = await fetch("/api/grupos");
      if (res.ok) setGrupos(await res.json());
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    if (isAdmin) {
      carregarLocais();
      carregarGrupos();
      carregarRelatorio(relTipo, relDia, relMes, relAno);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ─────────────────────────────────────────────────────────────────────────
  // Relatório Operacional
  // ─────────────────────────────────────────────────────────────────────────
  async function carregarRelatorio(
    tipo = relTipo,
    dia = relDia,
    mes = relMes,
    ano = relAno
  ) {
    setRelCarregando(true);
    try {
      let de = "", ate = "", desc = "";
      const hoje = toLocalDateStr();

      if (tipo === "hoje") {
        de = ate = hoje;
        desc = `Hoje (${fmtDate(hoje)})`;
      } else if (tipo === "dia") {
        de = ate = dia;
        desc = `Dia ${fmtDate(dia)}`;
      } else if (tipo === "este_mes") {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth() + 1;
        const last = new Date(y, m, 0).getDate();
        de = `${y}-${String(m).padStart(2,"0")}-01`;
        ate = `${y}-${String(m).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
        desc = `Este Mês (${String(m).padStart(2,"0")}/${y})`;
      } else if (tipo === "mes") {
        const [y, m] = mes.split("-").map(Number);
        const last = new Date(y, m, 0).getDate();
        de = `${y}-${String(m).padStart(2,"0")}-01`;
        ate = `${y}-${String(m).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
        desc = `Mês ${String(m).padStart(2,"0")}/${y}`;
      } else if (tipo === "ano") {
        de = `${ano}-01-01`; ate = `${ano}-12-31`;
        desc = `Ano ${ano}`;
      } else {
        de = ""; ate = ""; desc = "Todo o Histórico";
      }

      setRelDesc(desc);
      const url = de && ate ? `/api/relatorios?de=${de}&ate=${ate}` : "/api/relatorios";
      const res = await fetch(url);
      if (res.ok) setRelatorio(await res.json());
    } catch { /* silencioso */ }
    finally { setRelCarregando(false); }
  }

  function handleFiltro(tipo: typeof relTipo) {
    setRelTipo(tipo);
    carregarRelatorio(tipo, relDia, relMes, relAno);
  }

  // Copiar fechamento WhatsApp
  function copiarFechamentoWhatsApp() {
    if (!relatorio) return;
    let txt = `🍱 *QUENTINHAS DA RÊ — FECHAMENTO*\n📅 ${new Intl.DateTimeFormat("pt-BR").format(new Date())}\n`;
    txt += `------------------------------------\n\n🛵 *ACERTO DOS MOTOBOYS:*\n`;
    relatorio.por_motoboy.forEach((m) => {
      txt += `• *${m.nome}*: ${m.rotas} rotas (${m.quentinhas} quentinhas) = *R$ ${Number(m.custo).toFixed(2)}*\n`;
    });
    txt += `\n💰 *Total frete:* R$ ${relatorio.financeiro.custo.toFixed(2)}\n`;
    txt += `📦 *Total quentinhas:* ${relatorio.por_motoboy.reduce((a,m)=>a+Number(m.quentinhas),0)} un.\n`;
    txt += `------------------------------------\n✓ Quentinhas da Rê`;
    navigator.clipboard.writeText(txt);
    showToast("✓ Resumo copiado! Cole no WhatsApp.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Grupos de Cobrança
  // ─────────────────────────────────────────────────────────────────────────
  function abrirNovoGrupo() {
    setGrupoEditando(null);
    setGrupoNome("");
    setGrupoLocalIds([]);
    setModalGrupoAberto(true);
  }

  function abrirEditarGrupo(g: GrupoCobranca) {
    setGrupoEditando(g);
    setGrupoNome(g.nome);
    setGrupoLocalIds(g.locais.map((l) => l.id));
    setModalGrupoAberto(true);
  }

  async function salvarGrupo() {
    if (!grupoNome.trim()) { showToast("Informe o nome do grupo!"); return; }
    setSalvandoGrupo(true);
    try {
      if (grupoEditando) {
        const res = await fetch(`/api/grupos/${grupoEditando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: grupoNome.trim(), local_ids: grupoLocalIds }),
        });
        if (!res.ok) { showToast("Erro ao atualizar grupo"); return; }
        showToast("✓ Grupo atualizado!");
      } else {
        const res = await fetch("/api/grupos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: grupoNome.trim(), local_ids: grupoLocalIds }),
        });
        if (!res.ok) { showToast("Erro ao criar grupo"); return; }
        showToast("✓ Grupo criado!");
      }
      setModalGrupoAberto(false);
      await carregarGrupos();
    } catch { showToast("Erro de rede"); }
    finally { setSalvandoGrupo(false); }
  }

  async function excluirGrupo(g: GrupoCobranca) {
    setExcluindoGrupo(true);
    try {
      const res = await fetch(`/api/grupos/${g.id}`, { method: "DELETE" });
      if (!res.ok) { showToast("Erro ao excluir grupo"); return; }
      showToast("✓ Grupo removido!");
      setModalExcluirGrupo(null);
      await carregarGrupos();
    } catch { showToast("Erro de rede"); }
    finally { setExcluindoGrupo(false); }
  }

  function toggleLocalNoGrupo(localId: number) {
    setGrupoLocalIds((prev) =>
      prev.includes(localId) ? prev.filter((id) => id !== localId) : [...prev, localId]
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Comprovante
  // ─────────────────────────────────────────────────────────────────────────
  async function gerarComprovante() {
    if (!cobGrupoId) { showToast("Selecione um grupo!"); return; }
    setCobCarregando(true);
    try {
      const res = await fetch(`/api/relatorios?tipo=cobranca&grupo_id=${cobGrupoId}&de=${cobDe}&ate=${cobAte}`);
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao gerar comprovante"); return; }
      setCobDados((data.itens || []).map((item: ComprovanteItem) => ({ ...item, qtd_editada: Number(item.quentinhas) })));
      setCobPorDia(data.por_dia || []);
      setCobEditado({});
    } catch { showToast("Erro de rede"); }
    finally { setCobCarregando(false); }
  }

  function editarQtdComprovante(id: number, qtd: number) {
    setCobEditado((p) => ({ ...p, [id]: qtd }));
    setCobDados((p) => p ? p.map((i) => i.id === id ? { ...i, qtd_editada: qtd } : i) : p);
  }

  function copiarComprovanteWhatsApp() {
    if (!cobDados?.length) return;
    const grupo = grupos.find((g) => g.id === Number(cobGrupoId));
    const periodoStr = cobDe === cobAte ? fmtDate(cobDe) : `${fmtDate(cobDe)} a ${fmtDate(cobAte)}`;
    let txt = `🍱 *QUENTINHAS DA RÊ — COMPROVANTE DE COBRANÇA*\n`;
    if (grupo) txt += `👤 Cliente / Grupo: *${grupo.nome}*\n`;
    txt += `📅 Período: ${periodoStr}\n`;
    txt += `------------------------------------\n\n`;

    // 1. Discriminado por dia
    if (cobPorDia && cobPorDia.length > 0) {
      txt += `📅 *ENTREGAS POR DATA:*\n`;
      cobPorDia.forEach((d) => {
        const dStr = d.data.slice(0, 10);
        const partes = dStr.split("-").map(Number);
        const dataObj = new Date(partes[0], partes[1] - 1, partes[2]);
        const diaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dataObj.getDay()];
        txt += `• ${fmtDate(dStr)} (${diaSemana}): *${d.quentinhas} quentinhas*\n`;
      });
      txt += `\n`;
    }

    // 2. Resumo por local
    txt += `📍 *RESUMO POR LOCAL:*\n`;
    let total = 0, totalVal = 0;
    cobDados.forEach((item) => {
      const sub = item.qtd_editada * Number(item.valor_unidade);
      total += item.qtd_editada; totalVal += sub;
      txt += `• ${item.nome}: *${item.qtd_editada} un.* (R$ ${Number(item.valor_unidade).toFixed(2)}/un) — R$ ${sub.toFixed(2)}\n`;
    });

    // 3. Soma final
    txt += `\n------------------------------------\n`;
    txt += `📦 *TOTAL GERAL:* ${total} quentinhas\n`;
    txt += `💰 *VALOR TOTAL A PAGAR:* R$ ${totalVal.toFixed(2)}\n`;
    txt += `------------------------------------\n✓ Gerado pelo sistema Quentinhas da Rê`;
    navigator.clipboard.writeText(txt);
    showToast("✓ Comprovante copiado com datas e total!");
  }

  const locaisAtivos = useMemo(() => locais.filter((l) => l.ativo), [locais]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  if (authChecking) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "inherit", color: "#6b6558" }}>
        Verificando acesso...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", fontFamily: "inherit" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "var(--ink)", color: "#fff", padding: "11px 18px", border: "1px solid var(--kraft)", boxShadow: "4px 4px 0 rgba(0,0,0,0.2)", zIndex: 9999, fontSize: 13.5, fontWeight: 500, borderRadius: 4 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "var(--ink)", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ color: "#ccc", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            ← Voltar
          </a>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "var(--kraft)", color: "var(--ink)", width: 32, height: 32, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>QR</div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Relatórios — Quentinhas da Rê</span>
          </div>
        </div>
        {/* Abas no header */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["operacional", "grupos", "comprovante"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: tab === t ? 700 : 400,
                background: tab === t ? "var(--kraft)" : "transparent",
                color: tab === t ? "var(--ink)" : "rgba(255,255,255,0.75)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t === "operacional" ? "📊 Relatório" : t === "grupos" ? "👥 Grupos" : "📋 Comprovante"}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* ══════════════ ABA: RELATÓRIO OPERACIONAL ══════════════ */}
        {tab === "operacional" && (
          <div>
            {/* Filtros de período */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8a8372", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Período</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {([
                  ["hoje", "Hoje"],
                  ["este_mes", "Este Mês"],
                  ["tudo", "Todo o Histórico"],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={relTipo === k ? "active" : ""}
                    onClick={() => handleFiltro(k)}
                    style={{ padding: "7px 14px", fontSize: 13, fontWeight: relTipo === k ? 700 : 400, border: "1px solid var(--line)", borderRadius: 6, background: relTipo === k ? "var(--ink)" : "#fff", color: relTipo === k ? "#fff" : "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {label}
                  </button>
                ))}

                {/* Dia específico */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button
                    type="button"
                    style={{ padding: "7px 14px", fontSize: 13, fontWeight: relTipo === "dia" ? 700 : 400, border: "1px solid var(--line)", borderRadius: 6, background: relTipo === "dia" ? "var(--ink)" : "#fff", color: relTipo === "dia" ? "#fff" : "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}
                    onClick={() => handleFiltro("dia")}
                  >Dia específico</button>
                  {relTipo === "dia" && (
                    <input type="date" value={relDia} onChange={(e) => { setRelDia(e.target.value); carregarRelatorio("dia", e.target.value); }}
                      style={{ padding: "6px 8px", border: "1px solid var(--line)", fontSize: 13, borderRadius: 6, fontFamily: "inherit" }} />
                  )}
                </div>

                {/* Mês específico */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button
                    type="button"
                    style={{ padding: "7px 14px", fontSize: 13, fontWeight: relTipo === "mes" ? 700 : 400, border: "1px solid var(--line)", borderRadius: 6, background: relTipo === "mes" ? "var(--ink)" : "#fff", color: relTipo === "mes" ? "#fff" : "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}
                    onClick={() => handleFiltro("mes")}
                  >Mês específico</button>
                  {relTipo === "mes" && (
                    <input type="month" value={relMes} onChange={(e) => { setRelMes(e.target.value); carregarRelatorio("mes", undefined, e.target.value); }}
                      style={{ padding: "6px 8px", border: "1px solid var(--line)", fontSize: 13, borderRadius: 6, fontFamily: "inherit" }} />
                  )}
                </div>

                {/* Ano */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button
                    type="button"
                    style={{ padding: "7px 14px", fontSize: 13, fontWeight: relTipo === "ano" ? 700 : 400, border: "1px solid var(--line)", borderRadius: 6, background: relTipo === "ano" ? "var(--ink)" : "#fff", color: relTipo === "ano" ? "#fff" : "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}
                    onClick={() => handleFiltro("ano")}
                  >Ano</button>
                  {relTipo === "ano" && (
                    <select value={relAno} onChange={(e) => { setRelAno(e.target.value); carregarRelatorio("ano", undefined, undefined, e.target.value); }}
                      style={{ padding: "6px 10px", border: "1px solid var(--line)", fontSize: 13, borderRadius: 6, fontFamily: "inherit", background: "#fff" }}>
                      {[2026, 2025, 2024].map((y) => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Badge período atual */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#6b6558" }}>Período:</span>
                <span style={{ fontWeight: 700, fontSize: 13, background: "#F7F3EA", border: "1px solid var(--line)", padding: "4px 12px", borderRadius: 4 }}>
                  {relCarregando ? "Carregando..." : relDesc}
                </span>
                <button type="button" className="btn-whatsapp" onClick={copiarFechamentoWhatsApp} style={{ marginLeft: "auto" }}>
                  <span>💬</span><span>Copiar Fechamento</span>
                </button>
              </div>
            </div>

            {/* Cards financeiros */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Quentinhas entregues", value: `${relatorio?.financeiro?.quentinhas_total ?? 0} un.` },
                { label: "Rotas realizadas", value: `${relatorio?.financeiro?.rotas_total ?? 0}` },
                { label: "Faturamento bruto", value: `R$ ${relatorio ? relatorio.financeiro.receita.toFixed(2) : "0.00"}`, green: true },
                { label: "Custo frete", value: `R$ ${relatorio ? relatorio.financeiro.custo.toFixed(2) : "0.00"}`, red: true },
                { label: "Lucro líquido", value: `R$ ${relatorio ? relatorio.financeiro.saldo.toFixed(2) : "0.00"}`, green: relatorio ? relatorio.financeiro.saldo >= 0 : true, red: relatorio ? relatorio.financeiro.saldo < 0 : false },
              ].map((c) => (
                <div key={c.label} className="card" style={{ minWidth: 0 }}>
                  <div className="label" style={{ fontSize: 11 }}>{c.label}</div>
                  <div className="value" style={{ fontSize: 18, color: c.green ? "var(--route-green)" : c.red ? "var(--stamp-red)" : "var(--ink)" }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Tabela por motoboy */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                🛵 Produção por Entregador
                <span style={{ fontSize: 12, fontWeight: 400, color: "#7a7364" }}>(clique para expandir)</span>
              </div>
              <div className="table-container">
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>Entregador</th>
                      <th className="num">Rotas</th>
                      <th className="num">Quentinhas</th>
                      <th className="num">A Receber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio?.por_motoboy?.length ? relatorio.por_motoboy.map((m) => {
                      const isOpen = motoboyExpandido === m.id;
                      const rotasM = (relatorio.rotas_detalhadas || []).filter((r) => r.motoboy_id === m.id);
                      return (
                        <React.Fragment key={m.id}>
                          <tr className={`accordion-row ${isOpen ? "is-open" : ""}`} onClick={() => setMotoboyExpandido(isOpen ? null : m.id)} style={{ cursor: "pointer" }}>
                            <td><span className="accordion-arrow">{isOpen ? "▼" : "▶"}</span> <strong>{m.nome}</strong></td>
                            <td className="num">{m.rotas}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{m.quentinhas} un.</td>
                            <td className="num" style={{ fontWeight: 700 }}>R$ {Number(m.custo).toFixed(2)}</td>
                          </tr>
                          {isOpen && (
                            <tr className="accordion-details-row">
                              <td colSpan={4} className="accordion-details-cell">
                                <div style={{ padding: "10px 14px" }}>
                                  {rotasM.length === 0 ? (
                                    <div style={{ color: "#8a8372", fontSize: 12, padding: 8 }}>Nenhuma rota entregue.</div>
                                  ) : (
                                    <table className="sub-routes-table">
                                      <thead><tr><th>Data</th><th>Hora</th><th>Local</th><th className="num">Qtd</th><th className="num">Taxa</th></tr></thead>
                                      <tbody>
                                        {rotasM.map((r) => (
                                          <tr key={r.id}>
                                            <td>{fmtDate(r.data.slice(0,10))}</td>
                                            <td style={{ color: "#6b6558" }}>{r.entregue_em ? new Date(r.entregue_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—"}</td>
                                            <td><strong>{r.local_nome}</strong></td>
                                            <td className="num">{r.quantidade}</td>
                                            <td className="num">R$ {Number(r.custo).toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }) : (
                      <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>
                        {relCarregando ? "Carregando..." : "Nenhum dado no período."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela por local */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📍 Vendas por Ponto de Entrega</div>
              <div className="table-container">
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>Ponto de Entrega</th>
                      <th className="num">Quentinhas</th>
                      <th className="num">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio?.por_local?.length ? relatorio.por_local.map((l) => (
                      <tr key={l.id}>
                        <td><strong>{l.nome}</strong></td>
                        <td className="num">{l.quentinhas} un.</td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--route-green)" }}>R$ {Number(l.receita).toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>Nenhum dado no período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ ABA: GRUPOS DE COBRANÇA ══════════════ */}
        {tab === "grupos" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>👥 Grupos de Cobrança</div>
                <div style={{ fontSize: 12.5, color: "#7a7364", marginTop: 3 }}>
                  Crie grupos para reunir locais de um mesmo cliente e gerar comprovantes.
                </div>
              </div>
              <button type="button" className="btn" onClick={abrirNovoGrupo}>+ Novo Grupo</button>
            </div>

            {grupos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#8a8372", background: "#FAF8F5", border: "2px dashed var(--line)", borderRadius: 8 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Nenhum grupo cadastrado</div>
                <div style={{ fontSize: 13 }}>Crie um grupo para reunir locais de um mesmo cliente.</div>
                <button type="button" className="btn" style={{ marginTop: 16 }} onClick={abrirNovoGrupo}>+ Criar primeiro grupo</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {grupos.map((g) => (
                  <div key={g.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", boxShadow: "2px 2px 0 rgba(0,0,0,0.04)" }}>
                    {/* Header do card */}
                    <div style={{ background: "var(--ink)", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{g.nome}</div>
                        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{g.locais.length} local{g.locais.length !== 1 ? "is" : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => abrirEditarGrupo(g)} style={{ padding: "5px 10px", fontSize: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 5, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>✏️ Editar</button>
                        <button type="button" onClick={() => setModalExcluirGrupo(g)} style={{ padding: "5px 10px", fontSize: 12, background: "rgba(220,50,50,0.2)", border: "1px solid rgba(220,50,50,0.4)", borderRadius: 5, color: "#ffaaaa", cursor: "pointer", fontFamily: "inherit" }}>🗑️</button>
                      </div>
                    </div>
                    {/* Locais do grupo */}
                    <div style={{ padding: "10px 16px 14px" }}>
                      {g.locais.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: "#8a8372", fontStyle: "italic" }}>Nenhum local vinculado</div>
                      ) : (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {g.locais.map((l) => (
                            <li key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid #F0EDE4", fontSize: 13 }}>
                              <span style={{ color: "var(--route-green)", fontSize: 10 }}>●</span>
                              <span style={{ flex: 1 }}>{l.nome}</span>
                              <span style={{ fontSize: 11, color: "#8a8372" }}>R$ {Number(l.valor_unidade).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 12, background: "#F7F3EA", border: "1px solid var(--line)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                        onClick={() => { setCobGrupoId(g.id); setTab("comprovante"); }}
                      >
                        📋 Gerar Comprovante
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ ABA: COMPROVANTE ══════════════ */}
        {tab === "comprovante" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>📋 Comprovante de Cobrança</div>
            <div style={{ fontSize: 12.5, color: "#7a7364", marginBottom: 20 }}>
              Selecione um grupo e o período para gerar o comprovante de quentinhas e valor a cobrar.
            </div>

            {/* Seleção de grupo */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5a5548", marginBottom: 6 }}>GRUPO DE COBRANÇA</label>
              {grupos.length === 0 ? (
                <div style={{ padding: 14, background: "#FAF8F5", border: "1px dashed var(--line)", borderRadius: 6, fontSize: 13, color: "#8a8372" }}>
                  Nenhum grupo cadastrado.{" "}
                  <button type="button" onClick={() => setTab("grupos")} style={{ background: "none", border: "none", color: "var(--route-green)", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
                    Criar agora →
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                  {grupos.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setCobGrupoId(g.id)}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        border: cobGrupoId === g.id ? "2px solid var(--ink)" : "1px solid var(--line)",
                        borderRadius: 8,
                        background: cobGrupoId === g.id ? "var(--ink)" : "#fff",
                        color: cobGrupoId === g.id ? "#fff" : "var(--ink)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{g.nome}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>{g.locais.length} local{g.locais.length !== 1 ? "is" : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Período */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5a5548", marginBottom: 6 }}>DE</label>
                <input type="date" value={cobDe} onChange={(e) => setCobDe(e.target.value)} style={{ padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5a5548", marginBottom: 6 }}>ATÉ</label>
                <input type="date" value={cobAte} onChange={(e) => setCobAte(e.target.value)} style={{ padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: "#fff" }} />
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{ marginBottom: 24, padding: "11px 24px", fontSize: 14 }}
              disabled={!cobGrupoId || cobCarregando}
              onClick={gerarComprovante}
            >
              {cobCarregando ? "Gerando..." : "📋 Gerar Comprovante"}
            </button>

            {/* Preview comprovante */}
            {cobDados !== null && (
              <div style={{ border: "2px solid var(--kraft)", borderRadius: 10, overflow: "hidden", boxShadow: "3px 3px 0 rgba(0,0,0,0.06)" }}>
                {/* Header do comprovante */}
                <div style={{ background: "var(--ink)", color: "#fff", padding: "14px 18px" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>🍱 Comprovante — {grupos.find((g) => g.id === Number(cobGrupoId))?.nome}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>
                    Período: {fmtDate(cobDe)}{cobDe !== cobAte ? ` a ${fmtDate(cobAte)}` : ""}
                    {cobDados.length > 0 && <span style={{ marginLeft: 12 }}>✏️ Edite as quantidades se necessário</span>}
                  </div>
                </div>

                {cobDados.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#8a8372", fontSize: 13 }}>
                    Nenhuma quentinha entregue nos locais deste grupo no período informado.
                  </div>
                ) : (
                  <>
                    {/* Resumo visual por data */}
                    {cobPorDia.length > 0 && (
                      <div style={{ padding: "12px 16px", background: "#FAF8F5", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5a5548", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                          📅 Entregas por Data ({cobPorDia.length} {cobPorDia.length === 1 ? "dia" : "dias"})
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {cobPorDia.map((d) => {
                            const dStr = d.data.slice(0, 10);
                            const partes = dStr.split("-").map(Number);
                            const dataObj = new Date(partes[0], partes[1] - 1, partes[2]);
                            const diaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dataObj.getDay()];
                            return (
                              <div key={d.data} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 12px", fontSize: 12.5, boxShadow: "1px 1px 0 rgba(0,0,0,0.03)" }}>
                                <span style={{ color: "#6b6558" }}>{fmtDate(dStr)} ({diaSemana}):</span>{" "}
                                <strong style={{ color: "var(--ink)" }}>{d.quentinhas} un.</strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#F7F3EA", borderBottom: "1px solid var(--line)" }}>
                            <th style={{ textAlign: "left", padding: "9px 14px", fontWeight: 700 }}>Local</th>
                            <th style={{ textAlign: "center", padding: "9px 10px", fontWeight: 700, width: 120 }}>Quentinhas</th>
                            <th style={{ textAlign: "right", padding: "9px 14px", fontWeight: 700, width: 95 }}>Valor/un</th>
                            <th style={{ textAlign: "right", padding: "9px 14px", fontWeight: 700, width: 110 }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cobDados.map((item, idx) => {
                            const qtd = item.qtd_editada;
                            const valorUnit = Number(item.valor_unidade);
                            const sub = qtd * valorUnit;
                            const isEditado = cobEditado[item.id] !== undefined;
                            return (
                              <tr key={item.id} style={{ borderBottom: "1px solid #F0EDE4", background: idx % 2 === 0 ? "#fff" : "#FAFAF7" }}>
                                <td style={{ padding: "9px 14px", fontWeight: 600 }}>{item.nome}</td>
                                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                                  <input
                                    type="number" min={0} value={qtd}
                                    onChange={(e) => editarQtdComprovante(item.id, Number(e.target.value))}
                                    style={{ width: 72, padding: "5px 6px", border: isEditado ? "2px solid #F59E0B" : "1px solid var(--line)", borderRadius: 5, textAlign: "center", fontWeight: isEditado ? 700 : 400, fontSize: 13, background: isEditado ? "#FFFBEB" : "#fff", fontFamily: "inherit" }}
                                  />
                                  {isEditado && <div style={{ fontSize: 10, color: "#D97706", marginTop: 2 }}>orig: {Number(item.quentinhas)}</div>}
                                </td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: "#6b6558" }}>R$ {valorUnit.toFixed(2)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: "var(--route-green)" }}>R$ {sub.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "var(--ink)", color: "#fff" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>TOTAL</td>
                            <td style={{ padding: "10px", textAlign: "center", fontWeight: 700 }}>{cobDados.reduce((a,i)=>a+i.qtd_editada,0)} un.</td>
                            <td />
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 15 }}>
                              R$ {cobDados.reduce((a,i)=>a+i.qtd_editada*Number(i.valor_unidade),0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ padding: "12px 16px", background: "#F7F3EA", borderTop: "1px solid var(--line)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button type="button" className="btn-whatsapp" onClick={copiarComprovanteWhatsApp}>
                        <span>💬</span><span>Copiar para WhatsApp</span>
                      </button>
                      <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setCobDados(null); setCobEditado({}); }}>
                        ✕ Fechar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ MODAL: CRIAR / EDITAR GRUPO ══════════════ */}
      {modalGrupoAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 16px 40px" }}>
          <div style={{ background: "#FFFDF9", border: "2px solid var(--ink)", boxShadow: "6px 6px 0 rgba(0,0,0,0.15)", width: "100%", maxWidth: 500, borderRadius: 8, marginTop: 20 }}>
            {/* Header modal */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{grupoEditando ? "✏️ Editar Grupo" : "➕ Novo Grupo de Cobrança"}</h3>
              <button type="button" onClick={() => setModalGrupoAberto(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#8a8372", padding: "2px 6px" }}>✕</button>
            </div>

            <div style={{ padding: "18px 20px" }}>
              {/* Nome */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5a5548", marginBottom: 6 }}>NOME DO GRUPO</label>
                <input
                  type="text"
                  value={grupoNome}
                  onChange={(e) => setGrupoNome(e.target.value)}
                  placeholder="Ex: Hitalo, Maria, Fábrica do João..."
                  autoFocus
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>

              {/* Locais */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#5a5548", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>LOCAIS DO GRUPO ({grupoLocalIds.length} selecionado{grupoLocalIds.length !== 1 ? "s" : ""})</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setGrupoLocalIds(locaisAtivos.map((l)=>l.id))} style={{ background: "none", border: "none", color: "var(--route-green)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, textDecoration: "underline" }}>Todos</button>
                    <button type="button" onClick={() => setGrupoLocalIds([])} style={{ background: "none", border: "none", color: "#8a8372", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, textDecoration: "underline" }}>Nenhum</button>
                  </div>
                </div>

                <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 6 }}>
                  {locaisAtivos.length === 0 ? (
                    <div style={{ padding: 14, color: "#8a8372", fontSize: 13, textAlign: "center" }}>Nenhum local ativo cadastrado.</div>
                  ) : (
                    locaisAtivos.map((l) => {
                      const checked = grupoLocalIds.includes(l.id);
                      return (
                        <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: checked ? "#F0F7EC" : "#fff", borderBottom: "1px solid #F0EDE4", transition: "background 0.1s" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleLocalNoGrupo(l.id)} style={{ accentColor: "var(--route-green)", width: 16, height: 16, cursor: "pointer" }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: checked ? 600 : 400 }}>{l.nome}</span>
                          <span style={{ fontSize: 11.5, color: "#6b6558" }}>R$ {Number(l.valor_unidade).toFixed(2)}/un</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary" onClick={() => setModalGrupoAberto(false)} disabled={salvandoGrupo}>Cancelar</button>
              <button type="button" className="btn" onClick={salvarGrupo} disabled={salvandoGrupo || !grupoNome.trim()}>
                {salvandoGrupo ? "Salvando..." : grupoEditando ? "✓ Salvar Alterações" : "✓ Criar Grupo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: CONFIRMAR EXCLUSÃO ══════════════ */}
      {modalExcluirGrupo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
          <div style={{ background: "#FFFDF9", border: "2px solid var(--stamp-red)", boxShadow: "6px 6px 0 rgba(0,0,0,0.15)", width: "100%", maxWidth: 380, borderRadius: 8, padding: "24px 22px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>🗑️ Excluir Grupo</h3>
            <p style={{ fontSize: 14, color: "#4a4538", lineHeight: 1.5, margin: "0 0 18px" }}>
              Tem certeza que deseja excluir o grupo <strong>"{modalExcluirGrupo.nome}"</strong>?
              Os locais vinculados não serão excluídos, apenas a vinculação com o grupo.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setModalExcluirGrupo(null)} disabled={excluindoGrupo} style={{ flex: 1 }}>Cancelar</button>
              <button type="button" onClick={() => excluirGrupo(modalExcluirGrupo)} disabled={excluindoGrupo}
                style={{ flex: 1, padding: "10px", background: "var(--stamp-red)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {excluindoGrupo ? "Excluindo..." : "✓ Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
