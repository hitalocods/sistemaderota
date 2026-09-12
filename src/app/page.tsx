"use client";

import React, { useEffect, useState, useMemo, useRef, Fragment } from "react";


interface Usuario {
  role: "admin" | "motoboy";
  id?: number;
  nome: string;
  login?: string;
}

interface Local {
  id: number;
  nome: string;
  endereco: string | null;
  contato: string | null;
  valor_unidade: string | number;
  ativo: boolean;
}

interface Motoboy {
  id: number;
  nome: string;
  login: string;
  valor_rota: string | number;
  ativo: boolean;
}

interface Rota {
  id: number;
  data: string;
  quantidade: number;
  status: "pendente" | "entregue" | "cancelada";
  receita: string | number;
  custo: string | number;
  entregue_em: string | null;
  local_id: number;
  local_nome: string;
  motoboy_id: number;
  motoboy_nome: string;
}

interface RotaDetalhada {
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
}

interface Relatorio {
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
  rotas_detalhadas?: RotaDetalhada[];
  financeiro: {
    quentinhas_total?: number;
    rotas_total?: number;
    receita: number;
    custo: number;
    saldo: number;
  };
}

function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Home() {
  // Estado de Autenticação
  const [authChecking, setAuthChecking] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Formulário de Login
  const [loginTipo, setLoginTipo] = useState<"admin" | "motoboy">("admin");
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginEntrando, setLoginEntrando] = useState(false);

  // Visões e Abas
  const [currentView, setCurrentView] = useState<"admin" | "moto">("admin");
  const [adminTab, setAdminTab] = useState<"geral" | "locais" | "motoboys" | "relatorios">("geral");

  // Filtro de Data para a listagem de Rotas
  const [dataFiltro, setDataFiltro] = useState<string>(() => toLocalDateStr());

  // Dados do Sistema
  const [locais, setLocais] = useState<Local[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState("");

  // Filtro de Relatório
  const [periodoFiltro, setPeriodoFiltro] = useState<"dia" | "semana" | "mes" | "tudo">("semana");
  const [motoboyExpandidoId, setMotoboyExpandidoId] = useState<number | null>(null);


  // Formulário Nova Rota
  const [novaRotaLocalId, setNovaRotaLocalId] = useState<number | "">("");
  const [novaRotaMotoboyId, setNovaRotaMotoboyId] = useState<number | "">("");
  const [novaRotaQtd, setNovaRotaQtd] = useState<number>(30);
  const [criandoRota, setCriandoRota] = useState(false);

  // Modais de Criação e Gestão
  const [modalLocalAberto, setModalLocalAberto] = useState(false);
  const [modalMotoboyAberto, setModalMotoboyAberto] = useState(false);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [motoboyParaSenha, setMotoboyParaSenha] = useState<Motoboy | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  // Modal de Confirmação de Exclusão
  const [modalConfirmDelete, setModalConfirmDelete] = useState<{
    tipo: "local" | "motoboy";
    id: number;
    nome: string;
    ativo?: boolean;
  } | null>(null);

  // Formulários Locais & Motoboys
  const [novoLocalNome, setNovoLocalNome] = useState("");
  const [novoLocalEndereco, setNovoLocalEndereco] = useState("");
  const [novoLocalContato, setNovoLocalContato] = useState("");
  const [novoLocalValor, setNovoLocalValor] = useState("8.50");

  const [novoMotoNome, setNovoMotoNome] = useState("");
  const [novoMotoLogin, setNovoMotoLogin] = useState("");
  const [novoMotoSenha, setNovoMotoSenha] = useState("");
  const [novoMotoValor, setNovoMotoValor] = useState("6.00");

  // Simulação motoboy (usado apenas se admin alternar na demo)
  const [adminSimulatedMotoId, setAdminSimulatedMotoId] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Checagem de Sessão Ativa
  async function verificarSessao() {
    try {
      setAuthChecking(true);
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.usuario) {
        setUsuario(data.usuario);
        if (data.usuario.role === "motoboy") {
          setCurrentView("moto");
        } else {
          setCurrentView("admin");
        }
      } else {
        setUsuario(null);
      }
    } catch {
      setUsuario(null);
    } finally {
      setAuthChecking(false);
    }
  }

  useEffect(() => {
    verificarSessao();
  }, []);

  // Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoginEntrando(true);
      const body =
        loginTipo === "admin"
          ? { tipo: "admin", senha: loginSenha }
          : { tipo: "motoboy", login: loginUsuario, senha: loginSenha };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Falha no acesso");
        return;
      }

      setUsuario(data.usuario);
      setLoginSenha("");
      setLoginUsuario("");
      if (data.usuario.role === "motoboy") {
        setCurrentView("moto");
      } else {
        setCurrentView("admin");
      }
      showToast(`✓ Bem-vindo(a), ${data.usuario.nome}!`);
    } catch {
      showToast("Erro ao conectar ao servidor de login");
    } finally {
      setLoginEntrando(false);
    }
  }

  // Logout
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUsuario(null);
      showToast("Você saiu do sistema.");
    } catch {
      showToast("Erro ao sair");
    }
  }

  // Refs
  const localIdRef = useRef(novaRotaLocalId);
  localIdRef.current = novaRotaLocalId;
  const motoIdRef = useRef(novaRotaMotoboyId);
  motoIdRef.current = novaRotaMotoboyId;
  const dataFiltroRef = useRef(dataFiltro);
  dataFiltroRef.current = dataFiltro;

  // Carregamento de dados com filtro de data
  async function carregarTudo(isSilent = false) {
    if (!usuario) return;
    try {
      if (!isSilent) setLoading(true);

      const rotasUrl = dataFiltroRef.current
        ? `/api/rotas?de=${dataFiltroRef.current}&ate=${dataFiltroRef.current}`
        : "/api/rotas";

      const [resLocais, resMotoboys, resRotas] = await Promise.all([
        fetch("/api/locais").then((r) => r.json()),
        fetch("/api/motoboys").then((r) => r.json()),
        fetch(rotasUrl).then((r) => r.json()),
      ]);

      if (Array.isArray(resLocais)) {
        setLocais(resLocais);
        if (!localIdRef.current) {
          const primeiroAtivo = resLocais.find((l: Local) => l.ativo);
          if (primeiroAtivo) setNovaRotaLocalId(primeiroAtivo.id);
        }
      }

      if (Array.isArray(resMotoboys)) {
        setMotoboys(resMotoboys);
        if (!motoIdRef.current) {
          const primeiroAtivo = resMotoboys.find((m: Motoboy) => m.ativo);
          if (primeiroAtivo) setNovaRotaMotoboyId(primeiroAtivo.id);
        }
        if (!adminSimulatedMotoId && resMotoboys.length > 0) {
          const primeiroAtivo = resMotoboys.find((m: Motoboy) => m.ativo);
          if (primeiroAtivo) setAdminSimulatedMotoId(primeiroAtivo.id);
        }
      }

      if (Array.isArray(resRotas)) {
        setRotas(resRotas);
      }

      const agora = new Date();
      setLastSync(
        agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (err) {
      console.error("Erro na sincronização:", err);
      if (!isSilent) showToast("Erro ao conectar com o banco");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  async function carregarRelatorio(filtro: "dia" | "semana" | "mes" | "tudo" = periodoFiltro) {
    if (!usuario) return;
    try {
      const hoje = new Date();
      let de = "";
      let ate = "";

      if (filtro === "dia") {
        de = toLocalDateStr(hoje);
        ate = toLocalDateStr(hoje);
      } else if (filtro === "semana") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        de = toLocalDateStr(d);
        ate = toLocalDateStr(hoje);
      } else if (filtro === "mes") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        de = toLocalDateStr(d);
        ate = toLocalDateStr(hoje);
      }

      const url = de && ate ? `/api/relatorios?de=${de}&ate=${ate}` : "/api/relatorios";
      const res = await fetch(url);
      const data = await res.json();
      setRelatorio(data);
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
    }
  }

  // Polling em tempo real a cada 4 segundos
  useEffect(() => {
    if (usuario) {
      carregarTudo();
      const interval = setInterval(() => {
        carregarTudo(true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [usuario, dataFiltro]);

  useEffect(() => {
    if (usuario) {
      carregarRelatorio(periodoFiltro);
    }
  }, [periodoFiltro, rotas, usuario]);

  // Ações de Rotas
  async function handleCriarRota(e: React.FormEvent) {
    e.preventDefault();
    if (!novaRotaLocalId || !novaRotaMotoboyId || !novaRotaQtd) {
      showToast("Preencha local, motoboy e quantidade!");
      return;
    }

    try {
      setCriandoRota(true);
      const res = await fetch("/api/rotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local_id: Number(novaRotaLocalId),
          motoboy_id: Number(novaRotaMotoboyId),
          quantidade: Number(novaRotaQtd),
          data: dataFiltro,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erro ao criar rota");
        return;
      }

      showToast("✓ Rota despachada e sincronizada!");
      setNovaRotaQtd(30);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao criar rota");
    } finally {
      setCriandoRota(false);
    }
  }

  async function handleAlterarStatusRota(id: number, novoStatus: "pendente" | "entregue" | "cancelada") {
    try {
      setRotas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: novoStatus } : r))
      );

      const res = await fetch(`/api/rotas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!res.ok) {
        showToast("Erro ao salvar status");
        carregarTudo(true);
        return;
      }

      if (novoStatus === "entregue") {
        showToast("✓ Entrega confirmada!");
      } else {
        showToast(`Status: ${novoStatus.toUpperCase()}`);
      }
      carregarTudo(true);
    } catch {
      showToast("Erro ao conectar");
      carregarTudo(true);
    }
  }

  // Ações Locais & Motoboys
  async function handleCriarLocal(e: React.FormEvent) {
    e.preventDefault();
    if (!novoLocalNome || !novoLocalValor) return;

    try {
      const res = await fetch("/api/locais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoLocalNome,
          endereco: novoLocalEndereco,
          contato: novoLocalContato,
          valor_unidade: parseFloat(novoLocalValor),
        }),
      });

      if (res.ok) {
        showToast("✓ Local cadastrado com sucesso!");
        setNovoLocalNome("");
        setNovoLocalEndereco("");
        setNovoLocalContato("");
        setModalLocalAberto(false);
        carregarTudo(true);
      }
    } catch {
      showToast("Erro ao criar local");
    }
  }

  async function handleExcluirLocal(id: number) {
    try {
      const res = await fetch(`/api/locais/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.mensagem || "Local removido com sucesso!");
        setModalConfirmDelete(null);
        carregarTudo(true);
      }
    } catch {
      showToast("Erro de conexão");
    }
  }

  async function handleCriarMotoboy(e: React.FormEvent) {
    e.preventDefault();
    if (!novoMotoNome || !novoMotoLogin || !novoMotoSenha || !novoMotoValor) return;

    try {
      const res = await fetch("/api/motoboys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoMotoNome,
          login: novoMotoLogin,
          senha: novoMotoSenha,
          valor_rota: parseFloat(novoMotoValor),
        }),
      });

      if (res.ok) {
        showToast("✓ Motoboy cadastrado com sucesso!");
        setNovoMotoNome("");
        setNovoMotoLogin("");
        setNovoMotoSenha("");
        setModalMotoboyAberto(false);
        carregarTudo(true);
      }
    } catch {
      showToast("Erro de conexão");
    }
  }

  async function handleExcluirMotoboy(id: number) {
    try {
      const res = await fetch(`/api/motoboys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.mensagem || "Motoboy removido com sucesso!");
        setModalConfirmDelete(null);
        carregarTudo(true);
      }
    } catch {
      showToast("Erro de conexão");
    }
  }

  async function handleSalvarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!motoboyParaSenha || !novaSenha) return;

    try {
      const res = await fetch(`/api/motoboys/${motoboyParaSenha.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: novaSenha }),
      });

      if (res.ok) {
        showToast(`✓ Senha de ${motoboyParaSenha.nome} atualizada!`);
        setModalSenhaAberto(false);
        setNovaSenha("");
        setMotoboyParaSenha(null);
      }
    } catch {
      showToast("Erro ao alterar senha");
    }
  }

  // Copiar Fechamento para WhatsApp
  function handleCopiarWhatsApp() {
    if (!relatorio) return;
    const dataFormatada = new Intl.DateTimeFormat("pt-BR").format(new Date());

    let texto = `🍱 *QUENTINHAS DA RÊ — FECHAMENTO* 🍱\n`;
    texto += `📅 Data: ${dataFormatada}\n`;
    texto += `------------------------------------\n\n`;
    texto += `🛵 *ACERTO DOS MOTOBOYS:*\n`;

    relatorio.por_motoboy.forEach((m) => {
      texto += `• *${m.nome}*: ${m.rotas} rotas (${m.quentinhas} quentinhas) = *R$ ${Number(m.custo).toFixed(2)}*\n`;
    });

    texto += `\n💰 *Total pago em frete:* R$ ${relatorio.financeiro.custo.toFixed(2)}\n`;
    texto += `📦 *Total quentinhas entregues:* ${relatorio.por_motoboy.reduce((acc, i) => acc + Number(i.quentinhas), 0)} un.\n`;
    texto += `------------------------------------\n`;
    texto += `✓ Conferido pelo sistema Quentinhas da Rê`;

    navigator.clipboard.writeText(texto);
    showToast("✓ Resumo copiado! Abra o WhatsApp e cole na conversa.");
  }

  // Cálculos dos Cards
  const statsFiltradas = useMemo(() => {
    const totalRotas = rotas.length;
    const totalQuentinhas = rotas.reduce((acc, r) => acc + Number(r.quantidade), 0);
    const motoboysAtivosCount = motoboys.filter((m) => m.ativo).length;

    const receitaEntregue = rotas
      .filter((r) => r.status === "entregue")
      .reduce((acc, r) => acc + Number(r.receita), 0);
    const custoEntregue = rotas
      .filter((r) => r.status === "entregue")
      .reduce((acc, r) => acc + Number(r.custo), 0);
    const saldo = receitaEntregue - custoEntregue;

    return {
      rotas: totalRotas,
      quentinhas: totalQuentinhas,
      motoboysAtivos: motoboysAtivosCount,
      saldo,
    };
  }, [rotas, motoboys]);

  // Identificação do Motoboy ativo no simulador ou usuário logado
  const activeMotoId = useMemo(() => {
    if (usuario?.role === "motoboy") return usuario.id;
    return adminSimulatedMotoId;
  }, [usuario, adminSimulatedMotoId]);

  const rotasMotoboyAtivo = useMemo(() => {
    if (!activeMotoId) return [];
    return rotas.filter((r) => r.motoboy_id === activeMotoId);
  }, [rotas, activeMotoId]);

  const motoboyAtivoObj = motoboys.find((m) => m.id === activeMotoId);

  // Data formatada para o cabeçalho
  const dataExtenso = useMemo(() => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  }, []);



  // ============================================================
  // TELA DE LOGIN (QUANDO NÃO AUTENTICADO)
  // ============================================================
  if (!usuario) {
    return (
      <div className="login-screen-wrap">
        <div className="login-card">
          <div className="login-header-logo">
            <div className="stampmark">QR</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22 }}>Quentinhas da Rê</h1>
              <span style={{ fontSize: 12, color: "#6b6558" }}>Acesso ao Sistema Operacional</span>
            </div>
          </div>

          <div className="login-type-toggle">
            <button
              type="button"
              className={loginTipo === "admin" ? "active" : ""}
              onClick={() => setLoginTipo("admin")}
            >
              👩‍🍳 Dona Rê (Admin)
            </button>
            <button
              type="button"
              className={loginTipo === "motoboy" ? "active" : ""}
              onClick={() => setLoginTipo("motoboy")}
            >
              🛵 Entregador (Motoboy)
            </button>
          </div>

          <form onSubmit={handleLogin}>
            {loginTipo === "motoboy" && (
              <div className="field">
                <label>Seu Login de Acesso</label>
                <input
                  type="text"
                  placeholder="Ex: junior"
                  value={loginUsuario}
                  onChange={(e) => setLoginUsuario(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="field">
              <label>{loginTipo === "admin" ? "Senha de Administradora" : "Sua Senha"}</label>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                required
                autoFocus={loginTipo === "admin"}
              />
              {loginTipo === "admin" && (
                <span style={{ fontSize: 11.5, color: "#7a7364", marginTop: 4, display: "block" }}>
                  Dica: a senha padrão inicial é <code>re123</code>
                </span>
              )}
            </div>

            <button className="btn" type="submit" style={{ width: "100%", marginTop: 8 }} disabled={loginEntrando}>
              {loginEntrando ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // SISTEMA PRINCIPAL (APÓS LOGIN)
  // ============================================================
  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--ink)",
            color: "#fff",
            padding: "12px 20px",
            border: "1px solid var(--kraft)",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.2)",
            zIndex: 9999,
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          {toast}
        </div>
      )}

      {/* Barra de alternância superior com logout */}
      <div className="demo-bar">
        {usuario.role === "admin" ? (
          <>
            <button
              className={currentView === "admin" ? "active" : ""}
              onClick={() => setCurrentView("admin")}
            >
              Painel da Dona
            </button>
            <button
              className={currentView === "moto" ? "active" : ""}
              onClick={() => setCurrentView("moto")}
            >
              App do Motoboy (Simulador)
            </button>
          </>
        ) : (
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
            🛵 Olá, {usuario.nome}! Suas rotas de entrega
          </div>
        )}

        <div className="live-badge" title="Sincronização em tempo real ativa">
          <span className="live-dot"></span>
          <span>ao vivo {lastSync && `• ${lastSync}`}</span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            marginLeft: "auto",
            background: "transparent",
            borderColor: "#5a5548",
            color: "#e2d7c5",
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 3,
          }}
        >
          Sair
        </button>
      </div>

      <div className="container">
        {/* ======================= PAINEL DA DONA (ADMIN) ======================= */}
        {currentView === "admin" && usuario.role === "admin" && (
          <div>
            <div className="admin-header">
              <div className="brand">
                <div className="stampmark">QR</div>
                <div>
                  <h1>Quentinhas da Rê</h1>
                </div>
              </div>
              <div className="today" style={{ textTransform: "capitalize" }}>
                {dataExtenso}
              </div>
            </div>

            <div className="layout">
              {/* Menu Lateral */}
              <nav className="side">
                <button
                  className={adminTab === "geral" ? "active" : ""}
                  onClick={() => setAdminTab("geral")}
                >
                  Visão geral
                </button>
                <button
                  className={adminTab === "locais" ? "active" : ""}
                  onClick={() => setAdminTab("locais")}
                >
                  Locais ({locais.filter((l) => l.ativo).length})
                </button>
                <button
                  className={adminTab === "motoboys" ? "active" : ""}
                  onClick={() => setAdminTab("motoboys")}
                >
                  Motoboys ({motoboys.filter((m) => m.ativo).length})
                </button>
                <button
                  className={adminTab === "relatorios" ? "active" : ""}
                  onClick={() => setAdminTab("relatorios")}
                >
                  Relatórios
                </button>
              </nav>

              {/* Conteúdo Principal */}
              <div>
                {/* 1. ABA: VISÃO GERAL */}
                {adminTab === "geral" && (
                  <div>
                    {/* Filtro de Data Rápido */}
                    <div className="panel-title" style={{ marginBottom: 16 }}>
                      <div className="date-selector-row">
                        <span style={{ fontSize: 13, color: "#6b6558" }}>Visualizando data:</span>
                        <button
                          type="button"
                          className={`date-badge-btn ${dataFiltro === toLocalDateStr() ? "active" : ""}`}
                          onClick={() => setDataFiltro(toLocalDateStr())}
                        >
                          Hoje
                        </button>
                        <button
                          type="button"
                          className={`date-badge-btn ${
                            dataFiltro === toLocalDateStr(new Date(Date.now() - 86400000))
                              ? "active"
                              : ""
                          }`}
                          onClick={() => {
                            const ontem = new Date(Date.now() - 86400000);
                            setDataFiltro(toLocalDateStr(ontem));
                          }}
                        >
                          Ontem
                        </button>
                        <input
                          type="date"
                          value={dataFiltro}
                          onChange={(e) => setDataFiltro(e.target.value)}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid var(--line)",
                            background: "#fff",
                            fontFamily: "inherit",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>

                    {/* Cards de Resumo */}
                    <div className="cards">
                      <div className="card">
                        <div className="label">Rotas na data</div>
                        <div className="value">{statsFiltradas.rotas}</div>
                      </div>
                      <div className="card">
                        <div className="label">Quentinhas na data</div>
                        <div className="value">{statsFiltradas.quentinhas}</div>
                      </div>
                      <div className="card">
                        <div className="label">Motoboys ativos</div>
                        <div className="value">{statsFiltradas.motoboysAtivos}</div>
                      </div>
                      <div className="card">
                        <div className="label">Saldo apurado</div>
                        <div className="value">
                          R$ {statsFiltradas.saldo.toFixed(2).split(".")[0]}
                          <small>,{statsFiltradas.saldo.toFixed(2).split(".")[1]}</small>
                        </div>
                      </div>
                    </div>

                    {/* Grade: Tabela de Rotas + Formulário Nova Rota */}
                    <div className="grid-2">
                      <div>
                        <div className="panel-title">
                          <span>Rotas despachadas ({dataFiltro})</span>
                          <button
                            className="btn-secondary"
                            onClick={() => carregarTudo()}
                            title="Atualizar lista"
                          >
                            Atualizar
                          </button>
                        </div>

                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Local</th>
                                <th>Motoboy</th>
                                <th className="num">Qtd</th>
                                <th>Status</th>
                                <th style={{ textAlign: "center" }}>Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rotas.length === 0 ? (
                                <tr>
                                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>
                                    {loading ? "Carregando..." : `Nenhuma rota despachada em ${dataFiltro}.`}
                                  </td>
                                </tr>
                              ) : (
                                rotas.map((rota) => (
                                  <tr key={rota.id}>
                                    <td>
                                      <strong>{rota.local_nome}</strong>
                                    </td>
                                    <td>{rota.motoboy_nome}</td>
                                    <td className="num">{rota.quantidade}</td>
                                    <td>
                                      <span
                                        className={`stamp ${
                                          rota.status === "entregue"
                                            ? "ok"
                                            : rota.status === "pendente"
                                            ? "pend"
                                            : "cancel"
                                        }`}
                                      >
                                        {rota.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                                      {rota.status === "pendente" ? (
                                        <button
                                          className="btn-secondary"
                                          style={{ padding: "4px 8px", fontSize: 11 }}
                                          onClick={() => handleAlterarStatusRota(rota.id, "entregue")}
                                        >
                                          ✓ Entregue
                                        </button>
                                      ) : rota.status === "entregue" ? (
                                        <button
                                          className="btn-secondary"
                                          style={{ padding: "4px 8px", fontSize: 11 }}
                                          onClick={() => handleAlterarStatusRota(rota.id, "pendente")}
                                        >
                                          ↺ Reabrir
                                        </button>
                                      ) : null}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Formulário: Nova Rota */}
                      <div className="new-route">
                        <div className="panel-title">Nova rota</div>
                        <form onSubmit={handleCriarRota}>
                          <div className="field">
                            <label>Local de entrega</label>
                            <select
                              value={novaRotaLocalId}
                              onChange={(e) => setNovaRotaLocalId(Number(e.target.value))}
                              required
                            >
                              <option value="">Selecione...</option>
                              {locais
                                .filter((l) => l.ativo)
                                .map((local) => (
                                  <option key={local.id} value={local.id}>
                                    {local.nome}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="field">
                            <label>Motoboy responsável</label>
                            <select
                              value={novaRotaMotoboyId}
                              onChange={(e) => setNovaRotaMotoboyId(Number(e.target.value))}
                              required
                            >
                              <option value="">Selecione...</option>
                              {motoboys
                                .filter((m) => m.ativo)
                                .map((moto) => (
                                  <option key={moto.id} value={moto.id}>
                                    {moto.nome}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="field">
                            <label>Quantidade de quentinhas</label>
                            <input
                              type="number"
                              min="1"
                              value={novaRotaQtd}
                              onChange={(e) => setNovaRotaQtd(parseInt(e.target.value) || 0)}
                              required
                            />
                          </div>

                          <button className="btn" type="submit" style={{ width: "100%" }} disabled={criandoRota}>
                            {criandoRota ? "Criando..." : "Despachar Rota"}
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="perf"></div>

                    {/* Resumo Rápido de Relatórios */}
                    <div>
                      <div className="panel-title">
                        <span>Relatório semanal</span>
                        <div className="filters" style={{ margin: 0 }}>
                          <button
                            className={periodoFiltro === "dia" ? "active" : ""}
                            onClick={() => setPeriodoFiltro("dia")}
                          >
                            Dia
                          </button>
                          <button
                            className={periodoFiltro === "semana" ? "active" : ""}
                            onClick={() => setPeriodoFiltro("semana")}
                          >
                            Semana
                          </button>
                          <button
                            className={periodoFiltro === "mes" ? "active" : ""}
                            onClick={() => setPeriodoFiltro("mes")}
                          >
                            Mês
                          </button>
                        </div>
                      </div>

                      {relatorio && (
                        <div className="grid-2">
                          <div>
                            <div
                              className="panel-title"
                              style={{ fontSize: 12.5, color: "#6b6558" }}
                            >
                              Rotas e quentinhas por motoboy
                            </div>
                            {relatorio.por_motoboy.map((m) => {
                              const maxQtd = Math.max(
                                ...relatorio.por_motoboy.map((item) => Number(item.quentinhas)),
                                1
                              );
                              const pct = Math.round((Number(m.quentinhas) / maxQtd) * 100);
                              return (
                                <div className="bar-row" key={m.id}>
                                  <div className="name" title={m.nome}>
                                    {m.nome}
                                  </div>
                                  <div className="bar-track">
                                    <div
                                      className="bar-fill"
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                  <div className="amt">{m.quentinhas}</div>
                                </div>
                              );
                            })}
                          </div>

                          <div>
                            <div
                              className="panel-title"
                              style={{ fontSize: 12.5, color: "#6b6558" }}
                            >
                              Quentinhas por local
                            </div>
                            {relatorio.por_local.map((l) => {
                              const maxQtd = Math.max(
                                ...relatorio.por_local.map((item) => Number(item.quentinhas)),
                                1
                              );
                              const pct = Math.round((Number(l.quentinhas) / maxQtd) * 100);
                              return (
                                <div className="bar-row" key={l.id}>
                                  <div className="name" title={l.nome}>
                                    {l.nome.split("—")[0].trim()}
                                  </div>
                                  <div className="bar-track">
                                    <div
                                      className="bar-fill"
                                      style={{
                                        width: `${pct}%`,
                                        background: "var(--route-green)",
                                      }}
                                    ></div>
                                  </div>
                                  <div className="amt">{l.quentinhas}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. ABA: LOCAIS */}
                {adminTab === "locais" && (
                  <div>
                    <div className="panel-title">
                      <span>Gerenciamento de Locais</span>
                      <button className="btn" onClick={() => setModalLocalAberto(true)}>
                        + Adicionar local
                      </button>
                    </div>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Local</th>
                            <th>Endereço / Referência</th>
                            <th>Contato</th>
                            <th className="num">Valor Unidade</th>
                            <th>Status</th>
                            <th style={{ textAlign: "right" }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locais.map((local) => (
                            <tr key={local.id}>
                              <td>
                                <strong>{local.nome}</strong>
                              </td>
                              <td style={{ color: "#6b6558" }}>{local.endereco || "—"}</td>
                              <td>{local.contato || "—"}</td>
                              <td className="num">
                                R$ {Number(local.valor_unidade).toFixed(2)}
                              </td>
                              <td>
                                <span className={`stamp ${local.ativo ? "ok" : "cancel"}`}>
                                  {local.ativo ? "ATIVO" : "INATIVO"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  className="btn-danger-link"
                                  title={local.ativo ? "Inativar local" : "Excluir definitivamente da página"}
                                  onClick={() =>
                                    setModalConfirmDelete({
                                      tipo: "local",
                                      id: local.id,
                                      nome: local.nome,
                                      ativo: local.ativo,
                                    })
                                  }
                                >
                                  {local.ativo ? "Inativar" : "Excluir da página"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. ABA: MOTOBOYS */}
                {adminTab === "motoboys" && (
                  <div>
                    <div className="panel-title">
                      <span>Gerenciamento de Motoboys</span>
                      <button className="btn" onClick={() => setModalMotoboyAberto(true)}>
                        + Adicionar motoboy
                      </button>
                    </div>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Login</th>
                            <th className="num">Valor por rota</th>
                            <th>Status</th>
                            <th style={{ textAlign: "right" }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {motoboys.map((moto) => (
                            <tr key={moto.id}>
                              <td>
                                <strong>{moto.nome}</strong>
                              </td>
                              <td className="mono">{moto.login}</td>
                              <td className="num">
                                R$ {Number(moto.valor_rota).toFixed(2)}
                              </td>
                              <td>
                                <span className={`stamp ${moto.ativo ? "ok" : "cancel"}`}>
                                  {moto.ativo ? "ATIVO" : "INATIVO"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 6 }}>
                                  <button
                                    className="btn-secondary"
                                    style={{ fontSize: 11 }}
                                    onClick={() => {
                                      setMotoboyParaSenha(moto);
                                      setNovaSenha("");
                                      setModalSenhaAberto(true);
                                    }}
                                  >
                                    Mudar senha
                                  </button>
                                  <button
                                    className="btn-danger-link"
                                    title={moto.ativo ? "Inativar motoboy" : "Excluir definitivamente da página"}
                                    onClick={() =>
                                      setModalConfirmDelete({
                                        tipo: "motoboy",
                                        id: moto.id,
                                        nome: moto.nome,
                                        ativo: moto.ativo,
                                      })
                                    }
                                  >
                                    {moto.ativo ? "Inativar" : "Excluir da página"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. ABA: RELATÓRIOS E DETALHAMENTO DE ROTAS */}
                {adminTab === "relatorios" && (
                  <div>
                    <div className="panel-title">
                      <div>
                        <span style={{ fontSize: 16 }}>Relatórios Operacionais e Financeiros</span>
                        <div style={{ fontSize: 12, color: "#6b6558", fontWeight: 400, marginTop: 2 }}>
                          Consolidado de produção, entregas e acertos com motoboys
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div className="filters" style={{ margin: 0 }}>
                          <button
                            type="button"
                            className={periodoFiltro === "dia" ? "active" : ""}
                            onClick={() => {
                              setPeriodoFiltro("dia");
                              carregarRelatorio("dia");
                            }}
                          >
                            Hoje
                          </button>
                          <button
                            type="button"
                            className={periodoFiltro === "semana" ? "active" : ""}
                            onClick={() => {
                              setPeriodoFiltro("semana");
                              carregarRelatorio("semana");
                            }}
                          >
                            Últimos 7 dias
                          </button>
                          <button
                            type="button"
                            className={periodoFiltro === "mes" ? "active" : ""}
                            onClick={() => {
                              setPeriodoFiltro("mes");
                              carregarRelatorio("mes");
                            }}
                          >
                            Últimos 30 dias
                          </button>
                          <button
                            type="button"
                            className={periodoFiltro === "tudo" ? "active" : ""}
                            onClick={() => {
                              setPeriodoFiltro("tudo");
                              carregarRelatorio("tudo");
                            }}
                          >
                            Todo o Histórico
                          </button>
                        </div>

                        <button type="button" className="btn-whatsapp" onClick={handleCopiarWhatsApp}>
                          <span>💬</span>
                          <span>Copiar Fechamento para WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Cards de Métricas Operacionais e Financeiras */}
                    <div className="cards" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                      <div className="card">
                        <div className="label">Quentinhas entregues</div>
                        <div className="value">
                          {relatorio?.financeiro?.quentinhas_total ??
                            relatorio?.por_motoboy.reduce((acc, m) => acc + Number(m.quentinhas), 0) ??
                            0}
                          <small> un.</small>
                        </div>
                      </div>

                      <div className="card">
                        <div className="label">Total de viagens</div>
                        <div className="value">
                          {relatorio?.financeiro?.rotas_total ??
                            relatorio?.por_motoboy.reduce((acc, m) => acc + Number(m.rotas), 0) ??
                            0}
                          <small> rotas</small>
                        </div>
                      </div>

                      <div className="card">
                        <div className="label">Faturamento bruto</div>
                        <div className="value" style={{ fontSize: 20 }}>
                          R$ {relatorio ? relatorio.financeiro.receita.toFixed(2) : "0.00"}
                        </div>
                      </div>

                      <div className="card">
                        <div className="label">Custo frete (motoboys)</div>
                        <div className="value" style={{ fontSize: 20, color: "var(--stamp-red)" }}>
                          R$ {relatorio ? relatorio.financeiro.custo.toFixed(2) : "0.00"}
                        </div>
                      </div>

                      <div className="card">
                        <div className="label">Lucro líquido</div>
                        <div
                          className="value"
                          style={{
                            fontSize: 20,
                            color:
                              relatorio && relatorio.financeiro.saldo >= 0
                                ? "var(--route-green)"
                                : "var(--stamp-red)",
                          }}
                        >
                          R$ {relatorio ? relatorio.financeiro.saldo.toFixed(2) : "0.00"}
                        </div>
                      </div>
                    </div>

                    {/* Tabela Detalhada com Accordion de Rotas por Motoboy */}
                    <div style={{ marginBottom: 28 }}>
                      <div className="panel-title" style={{ fontSize: 13.5, color: "var(--ink)", marginBottom: 8 }}>
                        <span>
                          Produção e Extrato Individual de Rotas por Entregador{" "}
                          <span style={{ fontSize: 12, fontWeight: 400, color: "#7a7364" }}>
                            (clique na linha do motoboy para expandir todas as rotas dele)
                          </span>
                        </span>
                      </div>

                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Entregador (Motoboy)</th>
                              <th className="num">Rotas Realizadas</th>
                              <th className="num">Quentinhas Entregues</th>
                              <th className="num">Total a Receber (Custo)</th>
                              <th style={{ textAlign: "center", width: 140 }}>Detalhamento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorio?.por_motoboy && relatorio.por_motoboy.length > 0 ? (
                              relatorio.por_motoboy.map((m) => {
                                const isOpen = motoboyExpandidoId === m.id;
                                const rotasDesteMotoboy = (relatorio.rotas_detalhadas || []).filter(
                                  (r) => r.motoboy_id === m.id
                                );

                                return (
                                  <React.Fragment key={m.id}>
                                    <tr
                                      className={`accordion-row ${isOpen ? "is-open" : ""}`}
                                      onClick={() =>
                                        setMotoboyExpandidoId(isOpen ? null : m.id)
                                      }
                                      title="Clique para ver o extrato de rotas deste entregador"
                                    >
                                      <td>
                                        <span className="accordion-arrow">
                                          {isOpen ? "▼" : "▶"}
                                        </span>
                                        <strong>{m.nome}</strong>
                                      </td>
                                      <td className="num">{m.rotas} rotas</td>
                                      <td className="num" style={{ fontWeight: 700 }}>
                                        {m.quentinhas} un.
                                      </td>
                                      <td className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>
                                        R$ {Number(m.custo).toFixed(2)}
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "3px 8px", fontSize: 11 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMotoboyExpandidoId(isOpen ? null : m.id);
                                          }}
                                        >
                                          {isOpen ? "Ocultar ▲" : `Ver rotas (${rotasDesteMotoboy.length}) ▼`}
                                        </button>
                                      </td>
                                    </tr>

                                    {/* Linha de Detalhamento Expandida */}
                                    {isOpen && (
                                      <tr className="accordion-details-row">
                                        <td colSpan={5} className="accordion-details-cell">
                                          <div style={{ padding: "10px 16px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#5a5548" }}>
                                              📋 Extrato de entregas de {m.nome} no período ({rotasDesteMotoboy.length} entregas concluídas):
                                            </div>

                                            {rotasDesteMotoboy.length === 0 ? (
                                              <div style={{ padding: 12, color: "#8a8372", fontSize: 12, textAlign: "center" }}>
                                                Nenhuma rota entregue por este motoboy no período selecionado.
                                              </div>
                                            ) : (
                                              <table className="sub-routes-table">
                                                <thead>
                                                  <tr>
                                                    <th>Data</th>
                                                    <th>Entregue às</th>
                                                    <th>Ponto de Entrega (Destino)</th>
                                                    <th className="num">Quantidade</th>
                                                    <th className="num">Taxa do Motoboy</th>
                                                    <th style={{ textAlign: "center" }}>Status</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {rotasDesteMotoboy.map((r) => {
                                                    const horaFormatada = r.entregue_em
                                                      ? new Date(r.entregue_em).toLocaleTimeString("pt-BR", {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                        })
                                                      : "—";

                                                    const dataFormatada = r.data
                                                      ? new Date(r.data).toLocaleDateString("pt-BR", {
                                                          day: "2-digit",
                                                          month: "2-digit",
                                                        })
                                                      : "—";

                                                    return (
                                                      <tr key={r.id}>
                                                        <td style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                                                          {dataFormatada}
                                                        </td>
                                                        <td style={{ color: "#6b6558" }}>
                                                          {horaFormatada}
                                                        </td>
                                                        <td>
                                                          <strong>{r.local_nome}</strong>
                                                        </td>
                                                        <td className="num" style={{ fontWeight: 700 }}>
                                                          {r.quantidade} quentinhas
                                                        </td>
                                                        <td className="num" style={{ fontWeight: 600 }}>
                                                          R$ {Number(r.custo).toFixed(2)}
                                                        </td>
                                                        <td style={{ textAlign: "center" }}>
                                                          <span className="stamp ok" style={{ fontSize: 10, padding: "1px 6px" }}>
                                                            ENTREGUE
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>
                                  Nenhum dado encontrado para o período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Vendas por Ponto de Entrega */}
                    <div>
                      <div className="panel-title" style={{ fontSize: 13.5, color: "var(--ink)", marginBottom: 8 }}>
                        <span>Vendas e Faturamento por Ponto de Entrega</span>
                      </div>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Ponto de Entrega (Local)</th>
                              <th className="num">Quentinhas Entregues</th>
                              <th className="num">Receita Gerada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorio?.por_local && relatorio.por_local.length > 0 ? (
                              relatorio.por_local.map((l) => (
                                <tr key={l.id}>
                                  <td>
                                    <strong>{l.nome}</strong>
                                  </td>
                                  <td className="num">{l.quentinhas} un.</td>
                                  <td className="num" style={{ fontWeight: 700, color: "var(--route-green)" }}>
                                    R$ {Number(l.receita).toFixed(2)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>
                                  Nenhum dado no período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= APP DO MOTOBOY ======================= */}
        {currentView === "moto" && (
          <div className="phone-wrap">
            {/* Se for Admin simulando, mostra seletor */}
            {usuario.role === "admin" && (
              <div className="phone-selector-bar">
                <label style={{ fontSize: 13, color: "#6b6558" }}>Simular motoboy:</label>
                <select
                  style={{ padding: "6px 10px", border: "1px solid var(--line)" }}
                  value={adminSimulatedMotoId ?? ""}
                  onChange={(e) => setAdminSimulatedMotoId(Number(e.target.value))}
                >
                  {motoboys.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Simulador Phone com as Rotas Exclusivas do Motoboy */}
            <div className="phone">
              <div className="screen">
                <div className="m-header">
                  <h2>Minhas rotas</h2>
                  <div style={{ fontSize: 13, color: "#6b6558" }}>
                    {usuario.role === "motoboy" ? usuario.nome : motoboyAtivoObj?.nome || "Entregador"}
                  </div>
                </div>

                <div className="m-summary">
                  <div>
                    <span className="n">{rotasMotoboyAtivo.length}</span>
                    <span className="l">rotas hoje</span>
                  </div>
                  <div>
                    <span className="n">
                      {rotasMotoboyAtivo.reduce((acc, r) => acc + Number(r.quantidade), 0)}
                    </span>
                    <span className="l">quentinhas</span>
                  </div>
                </div>

                <div className="stop-list">
                  {rotasMotoboyAtivo.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 16px", color: "#8a8372" }}>
                      Nenhuma rota pendente para você no momento.
                    </div>
                  ) : (
                    rotasMotoboyAtivo.map((rota) => {
                      const isEntregue = rota.status === "entregue";
                      return (
                        <div
                          key={rota.id}
                          className={`stop ${isEntregue ? "delivered" : ""}`}
                        >
                          <div className="stop-top">
                            <span className="loc">{rota.local_nome}</span>
                            <span className={`stamp ${isEntregue ? "ok" : "pend"}`}>
                              {rota.status}
                            </span>
                          </div>

                          {/* Destaque de Quantidade */}
                          <div className="m-qty-badge">
                            <span>Quantidade para entrega:</span>
                            <span className="num-highlight">
                              {rota.quantidade} un.
                            </span>
                          </div>

                          <div className="stop-meta">
                            <span>Ponto de entrega indicado</span>
                          </div>

                          {/* Botão de Entrega */}
                          {!isEntregue ? (
                            <button
                              className="btn-delivery-action"
                              onClick={() => handleAlterarStatusRota(rota.id, "entregue")}
                            >
                              <span>✓ CONFIRMAR ENTREGA</span>
                            </button>
                          ) : (
                            <div className="delivered-status-box">
                              <span>✓ Entrega Concluída!</span>
                              <button
                                className="btn-undo-link"
                                onClick={() => handleAlterarStatusRota(rota.id, "pendente")}
                              >
                                Desfazer
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="m-footnote">
                  {rotasMotoboyAtivo.length > 0
                    ? "Toque no botão verde assim que realizar a entrega"
                    : "Aguardando novos despachos da Dona Rê"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAIS CLÁSSICOS (NOVO LOCAL, NOVO MOTOBOY, SENHA, EXCLUSÃO)
         ============================================================ */}

      {/* Modal: Adicionar Local */}
      {modalLocalAberto && (
        <div className="modal-overlay" onClick={() => setModalLocalAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Adicionar Local</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalLocalAberto(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCriarLocal}>
              <div className="field">
                <label>Nome do Local / Ponto</label>
                <input
                  type="text"
                  placeholder="Ex: Zona Leste — UFPI"
                  value={novoLocalNome}
                  onChange={(e) => setNovoLocalNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Endereço / Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Prédio CCH, Cantina"
                  value={novoLocalEndereco}
                  onChange={(e) => setNovoLocalEndereco(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Contato</label>
                <input
                  type="text"
                  placeholder="(86) 99999-9999"
                  value={novoLocalContato}
                  onChange={(e) => setNovoLocalContato(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Valor cobrado por quentinha (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={novoLocalValor}
                  onChange={(e) => setNovoLocalValor(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalLocalAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  Salvar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Motoboy */}
      {modalMotoboyAberto && (
        <div className="modal-overlay" onClick={() => setModalMotoboyAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Adicionar Motoboy</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalMotoboyAberto(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCriarMotoboy}>
              <div className="field">
                <label>Nome do entregador</label>
                <input
                  type="text"
                  placeholder="Ex: Roberto"
                  value={novoMotoNome}
                  onChange={(e) => setNovoMotoNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Login de acesso</label>
                <input
                  type="text"
                  placeholder="roberto"
                  value={novoMotoLogin}
                  onChange={(e) => setNovoMotoLogin(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Senha inicial</label>
                <input
                  type="password"
                  placeholder="Senha"
                  value={novoMotoSenha}
                  onChange={(e) => setNovoMotoSenha(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Valor pago por rota (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={novoMotoValor}
                  onChange={(e) => setNovoMotoValor(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalMotoboyAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  Salvar Motoboy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Redefinir Senha */}
      {modalSenhaAberto && motoboyParaSenha && (
        <div className="modal-overlay" onClick={() => setModalSenhaAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Mudar senha de {motoboyParaSenha.nome}</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalSenhaAberto(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSalvarSenha}>
              <div className="field">
                <label>Nova senha</label>
                <input
                  type="password"
                  placeholder="Digite a nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalSenhaAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  Salvar senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {modalConfirmDelete && (
        <div className="modal-overlay" onClick={() => setModalConfirmDelete(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 style={{ color: "var(--stamp-red)" }}>
                {modalConfirmDelete.ativo ? "Confirmar inativação" : "Excluir da página"}
              </h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalConfirmDelete(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13.5, margin: "14px 0" }}>
              Deseja realmente {modalConfirmDelete.ativo ? "inativar" : "remover da página"}{" "}
              {modalConfirmDelete.tipo === "local" ? "o local" : "o motoboy"}{" "}
              <strong>&quot;{modalConfirmDelete.nome}&quot;</strong>?
            </p>
            <p style={{ fontSize: 12, color: "#6b6558" }}>
              {modalConfirmDelete.ativo
                ? "O cadastro será desativado para novas rotas. Se desejar removê-lo da página depois, basta clicar em excluir novamente."
                : "Este item já está inativo e será removido da página. O histórico financeiro e de fechamentos continuará 100% preservado nos relatórios."}
            </p>
            <div className="modal-footer-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "var(--stamp-red)" }}
                onClick={() => {
                  if (modalConfirmDelete.tipo === "local") {
                    handleExcluirLocal(modalConfirmDelete.id);
                  } else {
                    handleExcluirMotoboy(modalConfirmDelete.id);
                  }
                }}
              >
                {modalConfirmDelete.ativo ? "Inativar" : "Excluir da Página"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
