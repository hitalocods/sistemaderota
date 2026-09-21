"use client";

import React, { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";


interface Usuario {
  role: "admin" | "motoboy";
  id?: number;
  nome: string;
  login?: string;
}

interface Local {
  id: number;
  nome: string;
  cliente_nome?: string | null;
  endereco: string | null;
  endereco_link?: string | null;
  contato: string | null;
  valor_unidade: string | number;
  ativo: boolean;
}

interface Motoboy {
  id: number;
  nome: string;
  login: string;
  whatsapp?: string | null;
  valor_rota: string | number;
  ativo: boolean;
  total_locais?: number;
}

interface Rota {
  id: number;
  data: string;
  quantidade: number;
  status: "pendente" | "entregue" | "cancelada";
  receita: string | number;
  custo: string | number;
  criado_em?: string | null;
  entregue_em: string | null;
  local_id: number;
  local_nome: string;
  local_cliente_nome?: string | null;
  local_endereco?: string | null;
  local_endereco_link?: string | null;
  local_contato?: string | null;
  motoboy_id: number;
  motoboy_nome: string;
  motoboy_whatsapp?: string | null;
  ajuste_quantidade?: number | null;
  ajuste_status?: "pendente" | "aprovado" | "recusado" | null;
  ajuste_solicitado_em?: string | null;
  ajuste_respondido_em?: string | null;
  carga_conferida?: boolean;
  carga_conferida_em?: string | null;
}

interface MotoboyLocal {
  id: number;
  local_id: number;
  ordem: number;
  qtd_padrao: number;
  ativo: boolean;
  criado_em: string;
  local_nome: string;
  local_cliente_nome?: string | null;
  local_endereco?: string | null;
  local_endereco_link?: string | null;
  local_contato?: string | null;
  local_valor_unidade: string | number;
  local_ativo: boolean;
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

interface AssinaturaInfo {
  id: number;
  cliente_nome: string;
  valor_mensal: number;
  status: "ativo" | "pendente" | "bloqueado";
  bloqueado: boolean;
  em_tolerancia: boolean;
  dias_restantes: number;
  dias_tolerancia: number;
  vence_em: string;
  pago_em: string | null;
  link_pagamento: string;
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

  // Assinatura e Licença (PagBank - R$ 85/mês)
  const [assinatura, setAssinatura] = useState<AssinaturaInfo | null>(null);
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);

  // Formulário de Login Unificado (Apenas Senha)
  const [loginSenha, setLoginSenha] = useState("");
  const [loginEntrando, setLoginEntrando] = useState(false);

  // Visões e Abas
  const [currentView, setCurrentView] = useState<"admin" | "moto">("admin");
  const [adminTab, setAdminTab] = useState<"geral" | "locais" | "motoboys" | "relatorios">("geral");

  // Filtro de Data para a listagem de Rotas (Visão Geral)
  const [dataFiltro, setDataFiltro] = useState<string>(() => toLocalDateStr());

  // ── Calendário de Rotas Despachadas ──────────────────────────────────────────
  const [calDiasComRotas, setCalDiasComRotas] = useState<string[]>([]);
  const [calMesAtual, setCalMesAtual] = useState<string>(() => toLocalDateStr().slice(0, 7));
  const [calCarregandoDias, setCalCarregandoDias] = useState(false);
  const [duplicandoRotas, setDuplicandoRotas] = useState(false);
  const [modalDuplicarAberto, setModalDuplicarAberto] = useState(false);

  // Dados do Sistema
  const [locais, setLocais] = useState<Local[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [buscaRotasDespachadas, setBuscaRotasDespachadas] = useState("");
  const [filtroTabelaQtd, setFiltroTabelaQtd] = useState<"todas" | "com_quentinhas" | "zeradas">("todas");
  const [buscaRotasMotoboy, setBuscaRotasMotoboy] = useState("");
  const [ordemRotasMotoIds, setOrdemRotasMotoIds] = useState<number[]>([]);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState("");

  // Filtros Avançados de Relatório (Hoje, Escolher Dia, Este Mês, Escolher Mês, Ano, Tudo)
  const [relTipoFiltro, setRelTipoFiltro] = useState<
    "hoje" | "dia_especifico" | "este_mes" | "mes_especifico" | "ano" | "tudo"
  >("hoje");
  const [relDiaEscolhido, setRelDiaEscolhido] = useState<string>(() => toLocalDateStr());
  const [relMesEscolhido, setRelMesEscolhido] = useState<string>(() => toLocalDateStr().slice(0, 7));
  const [relAnoEscolhido, setRelAnoEscolhido] = useState<string>(() => String(new Date().getFullYear()));
  const [relPeriodoDescricao, setRelPeriodoDescricao] = useState<string>("Hoje");
  const [motoboyExpandidoId, setMotoboyExpandidoId] = useState<number | null>(null);


  // Formulário Nova Rota
  const [novaRotaLocalId, setNovaRotaLocalId] = useState<number | "">("");
  const [novaRotaMotoboyId, setNovaRotaMotoboyId] = useState<number | "">("");
  const [novaRotaQtd, setNovaRotaQtd] = useState<number>(0);
  const [criandoRota, setCriandoRota] = useState(false);

  // Modais de Criação e Gestão
  const [modalLocalAberto, setModalLocalAberto] = useState(false);
  const [modalMotoboyAberto, setModalMotoboyAberto] = useState(false);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [motoboyParaSenha, setMotoboyParaSenha] = useState<Motoboy | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  // Modal de Edição de Rota
  const [modalEditarRotaAberto, setModalEditarRotaAberto] = useState(false);
  const [rotaParaEditar, setRotaParaEditar] = useState<Rota | null>(null);
  const [editRotaLocalId, setEditRotaLocalId] = useState<number | "">("");
  const [editRotaMotoboyId, setEditRotaMotoboyId] = useState<number | "">("");
  const [editRotaQtd, setEditRotaQtd] = useState<number>(0);
  const [salvandoEdicaoRota, setSalvandoEdicaoRota] = useState(false);

  // Modal de Exclusão de Rota
  const [modalExcluirRota, setModalExcluirRota] = useState<Rota | null>(null);
  const [excluindoRota, setExcluindoRota] = useState(false);

  // Modal de Edição de Local
  const [modalEditarLocalAberto, setModalEditarLocalAberto] = useState(false);
  const [localParaEditar, setLocalParaEditar] = useState<Local | null>(null);
  const [editLocalNome, setEditLocalNome] = useState("");
  const [editLocalClienteNome, setEditLocalClienteNome] = useState("");
  const [editLocalEndereco, setEditLocalEndereco] = useState("");
  const [editLocalEnderecoLink, setEditLocalEnderecoLink] = useState("");
  const [editLocalContato, setEditLocalContato] = useState("");
  const [editLocalValor, setEditLocalValor] = useState("8.50");
  const [salvandoEdicaoLocal, setSalvandoEdicaoLocal] = useState(false);

  // Busca rápida na aba de locais
  const [termoBuscaLocais, setTermoBuscaLocais] = useState("");

  // Modal de Confirmação de Exclusão
  const [modalConfirmDelete, setModalConfirmDelete] = useState<{
    tipo: "local" | "motoboy";
    id: number;
    nome: string;
    ativo?: boolean;
  } | null>(null);

  // Formulários Locais & Motoboys
  const [novoLocalNome, setNovoLocalNome] = useState("");
  const [novoLocalClienteNome, setNovoLocalClienteNome] = useState("");
  const [novoLocalEndereco, setNovoLocalEndereco] = useState("");
  const [novoLocalEnderecoLink, setNovoLocalEnderecoLink] = useState("");
  const [novoLocalContato, setNovoLocalContato] = useState("");
  const [novoLocalValor, setNovoLocalValor] = useState("8.50");

  const [novoMotoNome, setNovoMotoNome] = useState("");
  const [novoMotoLogin, setNovoMotoLogin] = useState("");
  const [novoMotoSenha, setNovoMotoSenha] = useState("");
  const [novoMotoValor, setNovoMotoValor] = useState("6.00");
  const [novoMotoWhatsapp, setNovoMotoWhatsapp] = useState("");

  // Simulação motoboy (usado apenas se admin alternar na demo)
  const [adminSimulatedMotoId, setAdminSimulatedMotoId] = useState<number | null>(null);

  // Card de rota expandido no App do Motoboy
  const [rotaCardExpandidaId, setRotaCardExpandidaId] = useState<number | null>(null);

  // Sub-aba do Motoboy: 'resumo' (Resumo de Carga / Placas) ou 'roteiro' (Roteiro de Entregas)
  const [motoSubTab, setMotoSubTab] = useState<"resumo" | "roteiro">("resumo");
  // Controle de ajuste de quantidade na conferência de placas
  const [ajustandoRotaId, setAjustandoRotaId] = useState<number | null>(null);
  const [valorAjusteTemp, setValorAjusteTemp] = useState<number>(0);
  const [enviandoAjusteId, setEnviandoAjusteId] = useState<number | null>(null);

  // ── Carteira de Locais por Motoboy ──────────────────────────────────────────
  const [carteiras, setCarteiras] = useState<Record<number, MotoboyLocal[]>>({});
  const [carteiraExpandida, setCarteiraExpandida] = useState<number | null>(null);
  const [carregandoCarteira, setCarregandoCarteira] = useState<number | null>(null);
  const [despachando, setDespachando] = useState(false);
  const [modalAddLocalCarteira, setModalAddLocalCarteira] = useState<number | null>(null);
  const [addLocalCarteiraId, setAddLocalCarteiraId] = useState<number | "">("");
  const [addLocalCarteiraQtd, setAddLocalCarteiraQtd] = useState<number>(0);
  const [adicionandoLocalCarteira, setAdicionandoLocalCarteira] = useState(false);
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editQtdId, setEditQtdId] = useState<{ motoboyId: number; localId: number } | null>(null);
  const [editQtdVal, setEditQtdVal] = useState<number>(0);

  // Modal de Despacho Rápido da Carteira por Motoboy
  const [modalDespachoMoto, setModalDespachoMoto] = useState<Motoboy | null>(null);
  const [despachoItens, setDespachoItens] = useState<
    Array<{ local_id: number; local_nome: string; local_cliente_nome?: string | null; quantidade: number }>
  >([]);
  const [salvandoDespachoRapido, setSalvandoDespachoRapido] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Consulta de Status da Assinatura / Licença
  const [gerandoAbacatePay, setGerandoAbacatePay] = useState(false);
  const [abacatePayErro, setAbacatePayErro] = useState<string | null>(null);
  const [dadosPixModal, setDadosPixModal] = useState<{
    qrCodeImage: string;
    brCode: string;
    valor: string;
  } | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  async function handlePagarAbacatePay() {
    try {
      setGerandoAbacatePay(true);
      setAbacatePayErro(null);
      const res = await fetch("/api/assinatura/abacatepay", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAbacatePayErro(data.error || "Não foi possível gerar a cobrança Pix.");
        showToast(data.error || "Erro ao gerar cobrança Pix");
        return;
      }

      if (data.tipo === "qrcode_direto" && data.pix) {
        setDadosPixModal(data.pix);
        setPixCopiado(false);
        showToast("✓ QR Code Pix gerado! Escaneie ou copie o código.");
      } else if (data.url) {
        showToast("✓ Cobrança Pix gerada com sucesso! Abrindo tela de pagamento...");
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      setAbacatePayErro("Erro de conexão ao gerar cobrança Pix.");
      showToast("Erro ao gerar Pix");
    } finally {
      setGerandoAbacatePay(false);
    }
  }

  async function carregarAssinatura() {
    try {
      const res = await fetch("/api/assinatura");
      if (res.ok) {
        const data = await res.json();
        if (data.assinatura) {
          setAssinatura(data.assinatura);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar assinatura:", err);
    }
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
    carregarAssinatura();
  }, []);

  // Login Unificado (Apenas Senha)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginSenha) {
      showToast("Por favor, digite sua senha de acesso");
      return;
    }
    try {
      setLoginEntrando(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senha: loginSenha.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Senha incorreta");
        return;
      }

      setUsuario(data.usuario);
      setLoginSenha("");
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
  const adminSimulatedMotoIdRef = useRef(adminSimulatedMotoId);
  adminSimulatedMotoIdRef.current = adminSimulatedMotoId;
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
          if (primeiroAtivo) {
            setNovaRotaLocalId(primeiroAtivo.id);
            localIdRef.current = primeiroAtivo.id;
          }
        }
      }

      if (Array.isArray(resMotoboys)) {
        setMotoboys(resMotoboys);
        if (!motoIdRef.current) {
          const primeiroAtivo = resMotoboys.find((m: Motoboy) => m.ativo);
          if (primeiroAtivo) {
            setNovaRotaMotoboyId(primeiroAtivo.id);
            motoIdRef.current = primeiroAtivo.id;
          }
        }
        setAdminSimulatedMotoId((prev) => {
          // Se já existe um motoboy selecionado e ele ainda existe na lista retornada, mantém ele!
          if (prev && resMotoboys.some((m: Motoboy) => m.id === prev)) {
            adminSimulatedMotoIdRef.current = prev;
            return prev;
          }
          if (adminSimulatedMotoIdRef.current && resMotoboys.some((m: Motoboy) => m.id === adminSimulatedMotoIdRef.current)) {
            return adminSimulatedMotoIdRef.current;
          }
          const primeiroAtivo = resMotoboys.find((m: Motoboy) => m.ativo);
          const escolhido = primeiroAtivo ? primeiroAtivo.id : (resMotoboys[0]?.id ?? null);
          adminSimulatedMotoIdRef.current = escolhido;
          return escolhido;
        });
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

  async function carregarRelatorioComFiltro(
    tipo = relTipoFiltro,
    dia = relDiaEscolhido,
    mes = relMesEscolhido,
    ano = relAnoEscolhido
  ) {
    if (!usuario) return;
    try {
      let de = "";
      let ate = "";
      let desc = "";

      if (tipo === "hoje") {
        const hoje = toLocalDateStr();
        de = hoje;
        ate = hoje;
        desc = `Hoje (${hoje.split("-").reverse().join("/")})`;
      } else if (tipo === "dia_especifico") {
        const d = dia || toLocalDateStr();
        de = d;
        ate = d;
        desc = `Dia ${d.split("-").reverse().join("/")}`;
      } else if (tipo === "este_mes") {
        const agora = new Date();
        const y = agora.getFullYear();
        const m = agora.getMonth() + 1;
        const ult = new Date(y, m, 0).getDate();
        de = `${y}-${String(m).padStart(2, "0")}-01`;
        ate = `${y}-${String(m).padStart(2, "0")}-${String(ult).padStart(2, "0")}`;
        desc = `Este Mês (${String(m).padStart(2, "0")}/${y})`;
      } else if (tipo === "mes_especifico") {
        const [y, m] = (mes || toLocalDateStr().slice(0, 7)).split("-").map(Number);
        const ult = new Date(y, m, 0).getDate();
        de = `${y}-${String(m).padStart(2, "0")}-01`;
        ate = `${y}-${String(m).padStart(2, "0")}-${String(ult).padStart(2, "0")}`;
        desc = `Mês ${String(m).padStart(2, "0")}/${y}`;
      } else if (tipo === "ano") {
        const y = ano || String(new Date().getFullYear());
        de = `${y}-01-01`;
        ate = `${y}-12-31`;
        desc = `Ano ${y}`;
      } else if (tipo === "tudo") {
        de = "";
        ate = "";
        desc = "Todo o Histórico";
      }

      setRelPeriodoDescricao(desc);
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
      carregarRelatorioComFiltro();
    }
  }, [relTipoFiltro, relDiaEscolhido, relMesEscolhido, relAnoEscolhido, rotas, usuario]);

  // Ações de Rotas
  async function handleCriarRota(e: React.FormEvent) {
    e.preventDefault();
    if (!novaRotaLocalId || !novaRotaMotoboyId || novaRotaQtd === undefined || novaRotaQtd === null || Number(novaRotaQtd) < 0) {
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
      setNovaRotaQtd(0);
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

  // Ações de Edição de Rota
  function handleAbrirEditarRota(r: Rota) {
    setRotaParaEditar(r);
    setEditRotaLocalId(r.local_id);
    setEditRotaMotoboyId(r.motoboy_id);
    setEditRotaQtd(r.quantidade);
    setModalEditarRotaAberto(true);
  }

  async function handleSalvarEdicaoRota(e: React.FormEvent) {
    e.preventDefault();
    if (!rotaParaEditar || !editRotaLocalId || !editRotaMotoboyId || editRotaQtd === undefined || editRotaQtd === null || Number(editRotaQtd) < 0) {
      showToast("Preencha local, motoboy e quantidade válida!");
      return;
    }

    try {
      setSalvandoEdicaoRota(true);
      const res = await fetch(`/api/rotas/${rotaParaEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local_id: Number(editRotaLocalId),
          motoboy_id: Number(editRotaMotoboyId),
          quantidade: Number(editRotaQtd),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erro ao editar rota");
        return;
      }

      showToast("✓ Rota atualizada com sucesso!");
      setModalEditarRotaAberto(false);
      setRotaParaEditar(null);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao editar rota");
    } finally {
      setSalvandoEdicaoRota(false);
    }
  }

  // Ação de Exclusão de Rota (Dona Rê)
  async function handleConfirmarExcluirRota(id: number) {
    try {
      setExcluindoRota(true);
      const res = await fetch(`/api/rotas/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erro ao excluir rota");
        return;
      }

      showToast("✓ Rota excluída com sucesso!");
      setModalExcluirRota(null);
      setModalEditarRotaAberto(false);
      setRotaParaEditar(null);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao excluir rota");
    } finally {
      setExcluindoRota(false);
    }
  }

  // Ações de Ajuste de Carga / Conferência de Placas
  async function handleSolicitarAjuste(rotaId: number, novaQtd: number) {
    if (!novaQtd || novaQtd <= 0) {
      showToast("A quantidade contada deve ser maior que zero!");
      return;
    }

    try {
      setEnviandoAjusteId(rotaId);
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "solicitar_ajuste",
          ajuste_quantidade: novaQtd,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erro ao solicitar alteração");
        return;
      }

      showToast("✓ Alteração enviada para confirmação da Dona Rê!");
      setAjustandoRotaId(null);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao enviar alteração");
    } finally {
      setEnviandoAjusteId(null);
    }
  }

  async function handleCancelarAjuste(rotaId: number) {
    try {
      setEnviandoAjusteId(rotaId);
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "cancelar_ajuste" }),
      });

      if (!res.ok) {
        showToast("Erro ao cancelar alteração");
        return;
      }

      showToast("Pedido de alteração cancelado.");
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao cancelar alteração");
    } finally {
      setEnviandoAjusteId(null);
    }
  }

  async function handleAprovarAjuste(rotaId: number) {
    try {
      setEnviandoAjusteId(rotaId);
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "aprovar_ajuste" }),
      });

      if (!res.ok) {
        showToast("Erro ao aprovar alteração");
        return;
      }

      showToast("✓ Alteração confirmada e quantidade atualizada!");
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao aprovar");
    } finally {
      setEnviandoAjusteId(null);
    }
  }

  async function handleRecusarAjuste(rotaId: number) {
    try {
      setEnviandoAjusteId(rotaId);
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "recusar_ajuste" }),
      });

      if (!res.ok) {
        showToast("Erro ao recusar alteração");
        return;
      }

      showToast("Alteração recusada (quantidade original mantida).");
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao recusar");
    } finally {
      setEnviandoAjusteId(null);
    }
  }

  // Ação de OK / Conferência de Carga (Placas) pelo Entregador
  async function handleToggleConferirCarga(id: number, novoStatus: boolean) {
    try {
      setRotas((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, carga_conferida: novoStatus, carga_conferida_em: novoStatus ? new Date().toISOString() : null }
            : r
        )
      );

      const res = await fetch(`/api/rotas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "conferir_carga", conferido: novoStatus }),
      });

      if (!res.ok) {
        showToast("Erro ao confirmar carga");
        carregarTudo(true);
        return;
      }

      showToast(novoStatus ? "✓ Carga confirmada (OK)!" : "Conferência desfeita");
      carregarTudo(true);
    } catch {
      showToast("Erro ao conectar");
      carregarTudo(true);
    }
  }

  // Ações Locais & Motoboys
  function handleAbrirEditarLocal(l: Local) {
    setLocalParaEditar(l);
    setEditLocalNome(l.nome);
    setEditLocalClienteNome(l.cliente_nome || "");
    setEditLocalEndereco(l.endereco || "");
    setEditLocalEnderecoLink(l.endereco_link || "");
    setEditLocalContato(l.contato || "");
    setEditLocalValor(String(l.valor_unidade));
    setModalEditarLocalAberto(true);
  }

  async function handleSalvarEdicaoLocal(e: React.FormEvent) {
    e.preventDefault();
    if (!localParaEditar || !editLocalNome || !editLocalValor) return;

    try {
      setSalvandoEdicaoLocal(true);
      const res = await fetch(`/api/locais/${localParaEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editLocalNome.trim(),
          cliente_nome: editLocalClienteNome.trim() || null,
          endereco: editLocalEndereco.trim() || null,
          endereco_link: editLocalEnderecoLink.trim() || null,
          contato: editLocalContato.trim() || null,
          valor_unidade: parseFloat(editLocalValor),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erro ao editar local");
        return;
      }

      showToast("✓ Local atualizado com sucesso!");
      setModalEditarLocalAberto(false);
      setLocalParaEditar(null);
      carregarTudo(true);
    } catch {
      showToast("Erro ao conectar");
    } finally {
      setSalvandoEdicaoLocal(false);
    }
  }

  async function handleCriarLocal(e: React.FormEvent) {
    e.preventDefault();
    if (!novoLocalNome || !novoLocalValor) return;

    try {
      const res = await fetch("/api/locais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoLocalNome,
          cliente_nome: novoLocalClienteNome.trim() || null,
          endereco: novoLocalEndereco.trim() || null,
          endereco_link: novoLocalEnderecoLink.trim() || null,
          contato: novoLocalContato.trim() || null,
          valor_unidade: parseFloat(novoLocalValor),
        }),
      });

      if (res.ok) {
        showToast("✓ Local cadastrado com sucesso!");
        setNovoLocalNome("");
        setNovoLocalClienteNome("");
        setNovoLocalEndereco("");
        setNovoLocalEnderecoLink("");
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
          whatsapp: novoMotoWhatsapp.trim() || null,
        }),
      });

      if (res.ok) {
        showToast("✓ Motoboy cadastrado com sucesso!");
        setNovoMotoNome("");
        setNovoMotoLogin("");
        setNovoMotoSenha("");
        setNovoMotoWhatsapp("");
        setModalMotoboyAberto(false);
        carregarTudo(true);
      }
    } catch {
      showToast("Erro de conexão");
    }
  }

  // Encaminhar detalhes da rota via WhatsApp para o motoboy
  function handleEnviarRotaWhatsApp(r: Rota) {
    const phoneRaw = r.motoboy_whatsapp ? r.motoboy_whatsapp.replace(/\D/g, "") : "";
    const phone = phoneRaw ? (phoneRaw.startsWith("55") ? phoneRaw : `55${phoneRaw}`) : "";

    let msg = `🍱 *QUENTINHAS DA RÊ — NOVA ROTA* 🛵\n\n`;
    msg += `Olá *${r.motoboy_nome}*! Seguem os dados para entrega:\n\n`;
    msg += `📍 *Destino:* ${r.local_nome}\n`;
    if (r.local_cliente_nome) msg += `👤 *Quem recebe:* ${r.local_cliente_nome}\n`;
    if (r.local_endereco) msg += `🏠 *Endereço:* ${r.local_endereco}\n`;
    if (r.local_endereco_link) msg += `🗺️ *Localização no Mapa:* ${r.local_endereco_link}\n`;
    msg += `📦 *Carga:* ${r.quantidade} quentinhas\n`;
    msg += `💰 *Seu frete nesta rota:* R$ ${Number(r.custo).toFixed(2)}\n`;
    msg += `📅 *Data:* ${r.data}\n\n`;
    msg += `Por favor, confirme ao sair e marque como entregue no sistema ao finalizar! 👍`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
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

  // Opções para busca rápida com lupa na Nova Rota
  const locaisOptions = useMemo(() => {
    return locais
      .filter((l) => l.ativo)
      .map((l) => ({
        id: l.id,
        nome: l.nome,
        subtitulo: l.endereco ? `End: ${l.endereco}` : null,
      }));
  }, [locais]);

  const motoboysOptions = useMemo(() => {
    return motoboys
      .filter((m) => m.ativo)
      .map((m) => ({
        id: m.id,
        nome: m.nome,
        subtitulo: m.whatsapp ? `Zap: ${m.whatsapp}` : null,
      }));
  }, [motoboys]);

  // Lista de locais filtrada para a aba Locais
  const locaisFiltrados = useMemo(() => {
    if (!termoBuscaLocais.trim()) return locais;
    const q = termoBuscaLocais.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return locais.filter((l) => {
      const nomeNorm = (l.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const cliNorm = (l.cliente_nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const endNorm = (l.endereco || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nomeNorm.includes(q) || cliNorm.includes(q) || endNorm.includes(q);
    });
  }, [locais, termoBuscaLocais]);

  // Identificação do Motoboy ativo no simulador ou usuário logado
  const activeMotoId = useMemo(() => {
    if (usuario?.role === "motoboy") return usuario.id;
    return adminSimulatedMotoId;
  }, [usuario, adminSimulatedMotoId]);

  const rotasMotoboyAtivo = useMemo(() => {
    if (!activeMotoId) return [];
    return rotas.filter((r) => r.motoboy_id === activeMotoId);
  }, [rotas, activeMotoId]);

  // Carrega ordem salva de rotas do motoboy para a data atual
  useEffect(() => {
    setBuscaRotasMotoboy("");
    if (!activeMotoId) {
      setOrdemRotasMotoIds([]);
      return;
    }
    try {
      const storageKey = `ordem_rotas_${activeMotoId}_${dataFiltro}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setOrdemRotasMotoIds(parsed);
          return;
        }
      }
      setOrdemRotasMotoIds([]);
    } catch {
      setOrdemRotasMotoIds([]);
    }
  }, [activeMotoId, dataFiltro]);

  // Rotas organizadas na sequência definida pelo motoboy (1ª, 2ª, 3ª, etc.)
  const rotasMotoboyOrdenadas = useMemo(() => {
    if (rotasMotoboyAtivo.length === 0) return [];
    if (ordemRotasMotoIds.length === 0) return rotasMotoboyAtivo;

    const map = new Map<number, Rota>();
    rotasMotoboyAtivo.forEach((r) => map.set(r.id, r));

    const resultado: Rota[] = [];
    for (const id of ordemRotasMotoIds) {
      const rota = map.get(id);
      if (rota) {
        resultado.push(rota);
        map.delete(id);
      }
    }
    // Inclui qualquer nova rota despachada posteriormente
    map.forEach((rota) => resultado.push(rota));

    return resultado;
  }, [rotasMotoboyAtivo, ordemRotasMotoIds]);

  // Lista de rotas do motoboy filtradas pela pesquisa rápida com a lupinha
  const rotasMotoboyExibidas = useMemo(() => {
    if (!buscaRotasMotoboy.trim()) return rotasMotoboyOrdenadas;
    const termo = buscaRotasMotoboy.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return rotasMotoboyOrdenadas.filter((r) => {
      const localNorm = (r.local_nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const clienteNorm = (r.local_cliente_nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const endNorm = (r.local_endereco || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const contatoNorm = (r.local_contato || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const statusNorm = (r.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const qtdNorm = String(r.quantidade || "");
      return (
        localNorm.includes(termo) ||
        clienteNorm.includes(termo) ||
        endNorm.includes(termo) ||
        contatoNorm.includes(termo) ||
        statusNorm.includes(termo) ||
        qtdNorm.includes(termo)
      );
    });
  }, [rotasMotoboyOrdenadas, buscaRotasMotoboy]);

  const moverOrdemRota = async (rotaId: number, direcao: "cima" | "baixo") => {
    const listaAtual = [...rotasMotoboyOrdenadas];
    const index = listaAtual.findIndex((r) => r.id === rotaId);
    if (index === -1) return;

    const novoIndex = direcao === "cima" ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= listaAtual.length) return;

    const temp = listaAtual[index];
    listaAtual[index] = listaAtual[novoIndex];
    listaAtual[novoIndex] = temp;

    const novosIds = listaAtual.map((r) => r.id);
    setOrdemRotasMotoIds(novosIds);

    try {
      if (activeMotoId) {
        localStorage.setItem(`ordem_rotas_${activeMotoId}_${dataFiltro}`, JSON.stringify(novosIds));
        // Persistir ordem fixa permanentemente na carteira do banco de dados!
        const payloadOrdem = listaAtual.map((r, i) => ({
          local_id: r.local_id,
          ordem: i + 1,
        }));
        await fetch(`/api/motoboys/${activeMotoId}/locais/ordem`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ordem: payloadOrdem }),
        });
      }
    } catch (e) {
      console.error("Erro ao salvar ordem no banco:", e);
    }
  };

  const reordenarRotaParaPosicao = async (rotaId: number, novaPosicao: number) => {
    const listaAtual = [...rotasMotoboyOrdenadas];
    const index = listaAtual.findIndex((r) => r.id === rotaId);
    if (index === -1) return;
    if (novaPosicao < 0 || novaPosicao >= listaAtual.length) return;

    const [item] = listaAtual.splice(index, 1);
    listaAtual.splice(novaPosicao, 0, item);

    const novosIds = listaAtual.map((r) => r.id);
    setOrdemRotasMotoIds(novosIds);

    try {
      if (activeMotoId) {
        localStorage.setItem(`ordem_rotas_${activeMotoId}_${dataFiltro}`, JSON.stringify(novosIds));
        // Persistir ordem fixa permanentemente na carteira do banco de dados!
        const payloadOrdem = listaAtual.map((r, i) => ({
          local_id: r.local_id,
          ordem: i + 1,
        }));
        await fetch(`/api/motoboys/${activeMotoId}/locais/ordem`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ordem: payloadOrdem }),
        });
      }
    } catch (e) {
      console.error("Erro ao salvar ordem no banco:", e);
    }
  };

  const resetarOrdemRotas = () => {
    setOrdemRotasMotoIds([]);
    try {
      if (activeMotoId) {
        localStorage.removeItem(`ordem_rotas_${activeMotoId}_${dataFiltro}`);
      }
    } catch {
      // ignore
    }
    showToast("Ordem de entregas restaurada para o padrão.");
  };

  // ── Carteira: handlers ──────────────────────────────────────────────────────

  async function carregarCarteira(motoboyId: number): Promise<MotoboyLocal[]> {
    try {
      setCarregandoCarteira(motoboyId);
      const res = await fetch(`/api/motoboys/${motoboyId}/locais`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erro ao carregar carteira");
        return [];
      }
      setCarteiras((prev) => ({ ...prev, [motoboyId]: data }));
      return data;
    } catch {
      showToast("Erro ao carregar carteira");
      return [];
    } finally {
      setCarregandoCarteira(null);
    }
  }

  // ── Edição Rápida Direta na Tabela de Rotas ─────────────────────────────────
  async function handleAtualizarQtdRapida(rotaId: number, novaQtd: number) {
    const qtdNum = Math.max(0, Number(novaQtd) || 0);
    // Atualização otimista local imediata
    setRotas((prev) =>
      prev.map((r) => (r.id === rotaId ? { ...r, quantidade: qtdNum } : r))
    );

    try {
      const res = await fetch(`/api/rotas/${rotaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade: qtdNum }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erro ao atualizar quantidade");
        await carregarTudo(true);
        return;
      }
      showToast("✓ Quantidade salva!");
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao salvar quantidade");
      await carregarTudo(true);
    }
  }

  // ── Modal de Despacho Rápido por Motoboy ────────────────────────────────────
  async function handleAbrirModalDespacho(moto: Motoboy) {
    let itensCarteira = carteiras[moto.id];
    if (!itensCarteira) {
      itensCarteira = await carregarCarteira(moto.id);
    }
    if (!itensCarteira || itensCarteira.length === 0) {
      showToast(`A carteira de ${moto.nome} está vazia. Adicione locais primeiro!`);
      return;
    }

    // Procura rotas já existentes no dia para pré-carregar as quantidades
    const itensPreenchidos = itensCarteira.map((item) => {
      const rotaExistente = rotas.find(
        (r) =>
          r.motoboy_id === moto.id &&
          r.local_id === item.local_id &&
          r.data.slice(0, 10) === dataFiltro
      );
      return {
        local_id: item.local_id,
        local_nome: item.local_nome,
        local_cliente_nome: item.local_cliente_nome,
        quantidade: rotaExistente !== undefined ? rotaExistente.quantidade : 0,
      };
    });

    setDespachoItens(itensPreenchidos);
    setModalDespachoMoto(moto);
  }

  async function handleConfirmarDespachoRapido() {
    if (!modalDespachoMoto) return;
    try {
      setSalvandoDespachoRapido(true);
      const res = await fetch("/api/rotas/despachar-carteiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: dataFiltro,
          motoboy_id: modalDespachoMoto.id,
          itens: despachoItens.map((i) => ({
            local_id: i.local_id,
            quantidade: Math.max(0, Number(i.quantidade) || 0),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erro ao despachar");
        return;
      }

      const totalQtd = despachoItens.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0);
      showToast(`✓ Despacho de ${modalDespachoMoto.nome} salvo com sucesso (${totalQtd} quentinhas)!`);
      setModalDespachoMoto(null);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao salvar despacho");
    } finally {
      setSalvandoDespachoRapido(false);
    }
  }

  async function handleAddLocalCarteira(motoboyId: number) {
    if (!addLocalCarteiraId) { showToast("Selecione um local"); return; }
    try {
      setAdicionandoLocalCarteira(true);
      const res = await fetch(`/api/motoboys/${motoboyId}/locais`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_id: Number(addLocalCarteiraId), qtd_padrao: addLocalCarteiraQtd }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao adicionar local"); return; }
      showToast("✓ Local adicionado à carteira!");
      setModalAddLocalCarteira(null);
      setAddLocalCarteiraId("");
      setAddLocalCarteiraQtd(0);
      await carregarCarteira(motoboyId);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede");
    } finally {
      setAdicionandoLocalCarteira(false);
    }
  }

  async function handleRemoverLocalCarteira(motoboyId: number, localId: number) {
    try {
      const res = await fetch(`/api/motoboys/${motoboyId}/locais`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_id: localId }),
      });
      if (!res.ok) { showToast("Erro ao remover local"); return; }
      showToast("Local removido da carteira");
      await carregarCarteira(motoboyId);
    } catch {
      showToast("Erro de rede");
    }
  }

  async function handleSalvarOrdemCarteira(motoboyId: number, lista: MotoboyLocal[]) {
    try {
      const ordemPayload = lista.map((item, idx) => ({ local_id: item.local_id, ordem: idx + 1 }));
      await fetch(`/api/motoboys/${motoboyId}/locais/ordem`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: ordemPayload }),
      });
      setCarteiras((prev) => ({ ...prev, [motoboyId]: lista.map((item, idx) => ({ ...item, ordem: idx + 1 })) }));
    } catch {
      showToast("Erro ao salvar ordem");
    }
  }

  async function handleSalvarQtdCarteira(motoboyId: number, localId: number, qtd: number) {
    try {
      const res = await fetch(`/api/motoboys/${motoboyId}/locais`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_id: localId, qtd_padrao: qtd }),
      });
      if (!res.ok) { showToast("Erro ao salvar quantidade"); return; }
      showToast("✓ Quantidade padrão salva!");
      setEditQtdId(null);
      await carregarCarteira(motoboyId);
    } catch {
      showToast("Erro de rede");
    }
  }

  async function handleDespacharCarteira(motoboyId: number) {
    try {
      setDespachando(true);
      const res = await fetch("/api/rotas/despachar-carteiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataFiltro, motoboy_ids: [motoboyId] }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao despachar"); return; }
      showToast(`✓ ${data.criadas} rota(s) despachada(s)!${data.puladas ? ` (${data.puladas} já existiam)` : ""}`);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao despachar");
    } finally {
      setDespachando(false);
    }
  }

  async function handleDespacharTodasCarteiras() {
    try {
      setDespachando(true);
      const res = await fetch("/api/rotas/despachar-carteiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataFiltro }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao despachar"); return; }
      showToast(`✓ ${data.criadas} rota(s) inicializada(s) para ${dataFiltro.split("-").reverse().join("/")}!`);
      await carregarTudo(true);
    } catch {
      showToast("Erro de rede ao despachar");
    } finally {
      setDespachando(false);
    }
  }

  // ── Calendário: carrega quais dias do mês têm rotas ─────────────────────────
  async function carregarDiasComRotas(mes: string) {
    if (!usuario) return;
    try {
      setCalCarregandoDias(true);
      const [ano, mesNum] = mes.split("-");
      const ultimoDia = new Date(Number(ano), Number(mesNum), 0).getDate();
      const de = `${mes}-01`;
      const ate = `${mes}-${String(ultimoDia).padStart(2, "0")}`;
      const res = await fetch(`/api/rotas?de=${de}&ate=${ate}`);
      if (res.ok) {
        const dados: Rota[] = await res.json();
        const dias = Array.from(new Set(dados.map((r) => r.data.slice(0, 10))));
        setCalDiasComRotas(dias);
      }
    } catch {
      // silencioso
    } finally {
      setCalCarregandoDias(false);
    }
  }

  // Carrega dias do mês sempre que o mês do calendário mudar
  useEffect(() => {
    if (usuario && adminTab === "geral") {
      carregarDiasComRotas(calMesAtual);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMesAtual, usuario, adminTab]);

  // Quando a data filtro muda de mês, atualiza o calendário
  useEffect(() => {
    const mesDaData = dataFiltro.slice(0, 7);
    if (mesDaData !== calMesAtual) {
      setCalMesAtual(mesDaData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFiltro]);

  // Duplicar rotas de um dia para outro
  async function handleDuplicarRotas(de: string, para: string) {
    try {
      setDuplicandoRotas(true);
      const res = await fetch("/api/rotas/duplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ de, para }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erro ao duplicar rotas");
        return;
      }
      showToast(`✓ ${data.duplicadas} rota(s) copiada(s) para ${para.split("-").reverse().join("/")}!`);
      setModalDuplicarAberto(false);
      setDataFiltro(para);
      await carregarTudo(true);
      await carregarDiasComRotas(para.slice(0, 7));
    } catch {
      showToast("Erro de rede ao duplicar rotas");
    } finally {
      setDuplicandoRotas(false);
    }
  }

  // Helper: próximo dia
  function proximoDia(data: string): string {
    const d = new Date(data + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return toLocalDateStr(d);
  }

  // Filtro de pesquisa com lupinha na tabela de rotas despachadas
  const rotasDespachadasFiltradas = useMemo(() => {
    let lista = rotas;
    if (filtroTabelaQtd === "com_quentinhas") {
      lista = lista.filter((r) => r.quantidade > 0);
    } else if (filtroTabelaQtd === "zeradas") {
      lista = lista.filter((r) => r.quantidade === 0);
    }

    if (!buscaRotasDespachadas.trim()) return lista;
    const termo = buscaRotasDespachadas.toLowerCase().trim();
    return lista.filter((r) => {
      const local = (r.local_nome || "").toLowerCase();
      const cliente = (r.local_cliente_nome || "").toLowerCase();
      const moto = (r.motoboy_nome || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      const endereco = (r.local_endereco || "").toLowerCase();
      const qtd = String(r.quantidade || "");
      return (
        local.includes(termo) ||
        cliente.includes(termo) ||
        moto.includes(termo) ||
        status.includes(termo) ||
        endereco.includes(termo) ||
        qtd.includes(termo)
      );
    });
  }, [rotas, buscaRotasDespachadas, filtroTabelaQtd]);

  // Lista de solicitações de alteração pendentes de aprovação pela Dona
  const ajustesPendentes = useMemo(() => {
    return rotas.filter((r) => r.ajuste_status === "pendente");
  }, [rotas]);

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

          <form onSubmit={handleLogin} style={{ marginTop: 20 }}>
            <div className="field">
              <label>Senha de Acesso</label>
              <input
                type="password"
                placeholder="Digite sua senha de acesso"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button className="btn" type="submit" style={{ width: "100%", marginTop: 14 }} disabled={loginEntrando}>
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
          <div className="demo-bar-nav">
            <button
              className={currentView === "admin" ? "active" : ""}
              onClick={() => setCurrentView("admin")}
            >
              👩‍🍳 Painel Dona
            </button>
            <button
              className={currentView === "moto" ? "active" : ""}
              onClick={() => setCurrentView("moto")}
            >
              🛵 App Motoboy
            </button>
          </div>
        ) : (
          <div className="demo-bar-user">
            🛵 <strong>{usuario.nome}</strong> (Suas entregas)
          </div>
        )}

        <div className="demo-bar-meta">
          <div className="live-badge" title="Sincronização em tempo real ativa">
            <span className="live-dot"></span>
            <span>ao vivo {lastSync && `• ${lastSync}`}</span>
          </div>

          <button
            onClick={handleLogout}
            className="demo-bar-logout"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Banner de Aviso de Vencimento / Pagamento */}
      {assinatura && !assinatura.bloqueado && (assinatura.em_tolerancia || (assinatura.dias_restantes <= 2 && assinatura.dias_restantes >= 0)) && (
        <div
          style={{
            background: assinatura.em_tolerancia ? "#FEF3C7" : "#EFF6FF",
            borderBottom: `2px solid ${assinatura.em_tolerancia ? "#F59E0B" : "#3B82F6"}`,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            color: assinatura.em_tolerancia ? "#92400E" : "#1E40AF",
            fontWeight: 500,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{assinatura.em_tolerancia ? "⚠️" : "🔔"}</span>
            <span>
              {assinatura.em_tolerancia ? (
                <>
                  <strong>Atenção:</strong> A mensalidade do sistema (<strong>R$ {assinatura.valor_mensal.toFixed(2)}</strong>) venceu. Renove via Pix para manter o acesso contínuo.
                </>
              ) : assinatura.dias_restantes === 0 ? (
                <>
                  <strong>Lembrete:</strong> A mensalidade de uso do sistema (<strong>R$ {assinatura.valor_mensal.toFixed(2)}</strong>) <strong>vence hoje</strong>!
                </>
              ) : (
                <>
                  <strong>Lembrete:</strong> A mensalidade de uso do sistema (<strong>R$ {assinatura.valor_mensal.toFixed(2)}</strong>) vence em <strong>{assinatura.dias_restantes} {assinatura.dias_restantes === 1 ? "dia" : "dias"}</strong>.
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePagarAbacatePay}
            disabled={gerandoAbacatePay}
            style={{
              background: "#16A34A",
              color: "#fff",
              border: "none",
              padding: "7px 16px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {gerandoAbacatePay ? "Gerando Pix..." : `⚡ Pagar R$ ${assinatura.valor_mensal.toFixed(2)} via Pix`}
          </button>
        </div>
      )}

      <div className="container">
        {/* ======================= PAINEL DA DONA (ADMIN) ======================= */}
        {currentView === "admin" && usuario.role === "admin" && (
          assinatura?.bloqueado ? (
            <div style={{ maxWidth: 520, margin: "40px auto 0" }}>
              <div
                className="panel-box"
                style={{
                  background: "#FFFDF9",
                  border: "2px solid var(--stamp-red)",
                  boxShadow: "6px 6px 0 var(--ink)",
                  padding: "32px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <h2 style={{ margin: "0 0 10px", fontSize: 22, color: "var(--stamp-red)" }}>
                  Acesso Temporariamente Suspenso
                </h2>
                <p style={{ fontSize: 14, color: "#6b6558", lineHeight: 1.5, margin: "0 0 20px" }}>
                  A mensalidade de uso do sistema está pendente. Para continuar gerenciando rotas, entregas e relatórios normalmente, efetue o pagamento via Pix.
                </p>

                <div
                  style={{
                    background: "#F7F3EA",
                    border: "1px solid var(--line)",
                    padding: "16px",
                    marginBottom: 20,
                    borderRadius: 6,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: "#6b6558" }}>Licença:</span>
                    <strong>Sistema Quentinhas da Rê</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: "#6b6558" }}>Valor da mensalidade:</span>
                    <strong style={{ fontSize: 16, color: "var(--route-green)" }}>R$ {assinatura.valor_mensal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span style={{ color: "#6b6558" }}>Forma de pagamento:</span>
                    <strong>Pix</strong>
                  </div>
                </div>

                {abacatePayErro && (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FCA5A5",
                      color: "#991B1B",
                      padding: "12px 14px",
                      borderRadius: 6,
                      fontSize: 12.5,
                      textAlign: "left",
                      marginBottom: 16,
                      lineHeight: 1.45,
                    }}
                  >
                    <strong>⚠️ Aviso sobre a Cobrança:</strong>
                    <div style={{ marginTop: 4 }}>{abacatePayErro}</div>
                    {assinatura.link_pagamento && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={assinatura.link_pagamento}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#1D4ED8", fontWeight: 700, textDecoration: "underline" }}
                        >
                          Clique aqui para abrir link direto de pagamento ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="btn"
                  disabled={gerandoAbacatePay}
                  onClick={handlePagarAbacatePay}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    padding: "14px",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    marginBottom: 12,
                    background: "var(--route-green)",
                    cursor: gerandoAbacatePay ? "wait" : "pointer",
                  }}
                >
                  {gerandoAbacatePay ? "⏳ Gerando Pix..." : `⚡ Pagar R$ ${assinatura.valor_mensal.toFixed(2)} via Pix`}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px", fontSize: 13 }}
                  onClick={() => {
                    carregarAssinatura();
                    showToast("Verificando status da licença...");
                  }}
                >
                  ↻ Já paguei / Atualizar liberação
                </button>
              </div>
            </div>
          ) : (
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
                <a
                  href="/relatorios"
                  style={{
                    display: "block",
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink)",
                    textDecoration: "none",
                    borderRadius: 4,
                    background: "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper-alt)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  📊 Relatórios ↗
                </a>
                <button
                  type="button"
                  onClick={() => setModalAssinaturaAberto(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  title="Consultar Licença Atlas"
                >
                  <span>Licença Atlas</span>
                  {assinatura?.bloqueado ? (
                    <span className="stamp cancel" style={{ fontSize: 9, padding: "1px 4px" }}>
                      BLOQ
                    </span>
                  ) : assinatura?.em_tolerancia ? (
                    <span className="stamp pend" style={{ fontSize: 9, padding: "1px 4px" }}>
                      AVISO
                    </span>
                  ) : null}
                </button>
              </nav>

              {/* Conteúdo Principal */}
              <div>
                {/* 1. ABA: VISÃO GERAL */}
                {adminTab === "geral" && (
                  <div>
                    {/* ── CALENDÁRIO DE ROTAS DESPACHADAS ── */}
                    <div style={{ marginBottom: 20 }}>
                      {/* Cabeçalho do calendário */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => {
                              const [ano, mes] = calMesAtual.split("-").map(Number);
                              const d = new Date(ano, mes - 2, 1);
                              setCalMesAtual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                            }}
                            title="Mês anterior"
                          >
                            ◀
                          </button>
                          <span style={{ fontWeight: 700, fontSize: 14, minWidth: 120, textAlign: "center" }}>
                            {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
                              new Date(calMesAtual + "-15")
                            )}
                          </span>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => {
                              const [ano, mes] = calMesAtual.split("-").map(Number);
                              const d = new Date(ano, mes, 1);
                              setCalMesAtual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                            }}
                            title="Próximo mês"
                          >
                            ▶
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            className={`date-badge-btn ${dataFiltro === toLocalDateStr() ? "active" : ""}`}
                            onClick={() => setDataFiltro(toLocalDateStr())}
                          >
                            Hoje
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

                      {/* Grade do Calendário */}
                      {(() => {
                        const [ano, mes] = calMesAtual.split("-").map(Number);
                        const primeiroDia = new Date(ano, mes - 1, 1).getDay(); // 0=dom
                        const ultimoDia = new Date(ano, mes, 0).getDate();
                        const hoje = toLocalDateStr();

                        const dias: (number | null)[] = [];
                        for (let i = 0; i < primeiroDia; i++) dias.push(null);
                        for (let d = 1; d <= ultimoDia; d++) dias.push(d);

                        return (
                          <div>
                            {/* Cabeçalhos dos dias da semana */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
                              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                                <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#8a8372", padding: "2px 0" }}>
                                  {d}
                                </div>
                              ))}
                            </div>
                            {/* Células dos dias */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                              {dias.map((dia, idx) => {
                                if (dia === null) return <div key={`empty-${idx}`} />;
                                const dateStr = `${calMesAtual}-${String(dia).padStart(2, "0")}`;
                                const temRotas = calDiasComRotas.includes(dateStr);
                                const isHoje = dateStr === hoje;
                                const isSelecionado = dateStr === dataFiltro;

                                return (
                                  <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => setDataFiltro(dateStr)}
                                    title={temRotas ? `${dia} — tem rotas` : `${dia}`}
                                    style={{
                                      position: "relative",
                                      padding: "6px 4px",
                                      fontSize: 12,
                                      fontWeight: isSelecionado || isHoje ? 700 : 400,
                                      border: isSelecionado
                                        ? "2px solid var(--ink)"
                                        : isHoje
                                        ? "1px solid var(--kraft)"
                                        : "1px solid transparent",
                                      borderRadius: 6,
                                      background: isSelecionado
                                        ? "var(--ink)"
                                        : isHoje
                                        ? "#FFF8E7"
                                        : temRotas
                                        ? "#F0F7EC"
                                        : "#FAF8F5",
                                      color: isSelecionado ? "#fff" : "var(--ink)",
                                      cursor: "pointer",
                                      textAlign: "center",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {dia}
                                    {temRotas && (
                                      <span
                                        style={{
                                          display: "block",
                                          width: 5,
                                          height: 5,
                                          borderRadius: "50%",
                                          background: isSelecionado ? "#fff" : "var(--route-green)",
                                          margin: "2px auto 0",
                                        }}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Botão de duplicar rotas */}
                      {calDiasComRotas.includes(dataFiltro) && (
                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            background: "#FFFBF2",
                            border: "1px dashed #E2D9C8",
                            borderRadius: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#6b6558", flex: 1 }}>
                            📋 <strong>{rotas.length} rota(s)</strong> em {dataFiltro.split("-").reverse().join("/")}
                          </span>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 12, padding: "5px 12px", whiteSpace: "nowrap" }}
                            onClick={() => setModalDuplicarAberto(true)}
                            title={`Duplicar rotas de ${dataFiltro} para ${proximoDia(dataFiltro)}`}
                          >
                            📋 Duplicar para {proximoDia(dataFiltro).split("-").reverse().join("/")}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Modal de confirmação de duplicação */}
                    {modalDuplicarAberto && (
                      <div
                        style={{
                          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            background: "#FFFDF9", border: "2px solid var(--ink)",
                            boxShadow: "6px 6px 0 rgba(0,0,0,0.2)",
                            padding: "28px 24px", maxWidth: 380, width: "90%",
                          }}
                        >
                          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>📋 Duplicar Rotas</h3>
                          <p style={{ fontSize: 14, color: "#4a4538", lineHeight: 1.5, margin: "0 0 20px" }}>
                            Deseja copiar todas as <strong>{rotas.length} rotas</strong> do dia{" "}
                            <strong>{dataFiltro.split("-").reverse().join("/")}</strong> para o dia{" "}
                            <strong>{proximoDia(dataFiltro).split("-").reverse().join("/")}</strong> com status pendente?
                          </p>
                          <div style={{ display: "flex", gap: 10 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setModalDuplicarAberto(false)}
                              disabled={duplicandoRotas}
                              style={{ flex: 1 }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleDuplicarRotas(dataFiltro, proximoDia(dataFiltro))}
                              disabled={duplicandoRotas}
                              style={{ flex: 1 }}
                            >
                              {duplicandoRotas ? "Duplicando..." : "✓ Confirmar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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

                    {/* Grade: Formulário Nova Rota (no topo no mobile/tablet) + Cards/Tabela de Rotas Despachadas */}
                    <div className="grid-2-routes">
                      {/* Formulário: Nova Rota */}
                      <div className="new-route">
                        <div className="panel-title">Nova rota</div>
                        <form onSubmit={handleCriarRota}>
                          {/* Local com Lupa e Busca Dinâmica */}
                          <SearchableSelect
                            label="Local de entrega"
                            placeholder="Buscar ou selecionar local..."
                            options={locaisOptions}
                            value={novaRotaLocalId}
                            onChange={(id) => setNovaRotaLocalId(id)}
                            required
                          />

                          {/* Motoboy com Lupa e Busca Dinâmica */}
                          <SearchableSelect
                            label="Motoboy responsável"
                            placeholder="Buscar ou selecionar motoboy..."
                            options={motoboysOptions}
                            value={novaRotaMotoboyId}
                            onChange={(id) => setNovaRotaMotoboyId(id)}
                            required
                          />

                          <div className="field">
                            <label>Quantidade de quentinhas</label>
                            <input
                              type="number"
                              min="0"
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

                      <div className="rotas-table-wrap">
                        <div className="panel-title">
                          <span>
                            Rotas despachadas ({dataFiltro})
                            {buscaRotasDespachadas.trim() && (
                              <small style={{ marginLeft: 6, fontSize: 12, fontWeight: "normal", color: "#6b6558" }}>
                                ({rotasDespachadasFiltradas.length} de {rotas.length})
                              </small>
                            )}
                          </span>
                          <button
                            className="btn-secondary"
                            onClick={() => carregarTudo()}
                            title="Atualizar lista"
                          >
                            Atualizar
                          </button>
                        </div>

                        {/* Filtros Rápidos de Exibição */}
                        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: 11.5,
                              padding: "4px 10px",
                              fontWeight: filtroTabelaQtd === "todas" ? 700 : 500,
                              background: filtroTabelaQtd === "todas" ? "var(--kraft)" : "#fff",
                              color: filtroTabelaQtd === "todas" ? "#fff" : "var(--ink)",
                              borderColor: "var(--kraft)",
                            }}
                            onClick={() => setFiltroTabelaQtd("todas")}
                          >
                            📋 Todas as Paradas ({rotas.length})
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: 11.5,
                              padding: "4px 10px",
                              fontWeight: filtroTabelaQtd === "com_quentinhas" ? 700 : 500,
                              background: filtroTabelaQtd === "com_quentinhas" ? "var(--route-green)" : "#fff",
                              color: filtroTabelaQtd === "com_quentinhas" ? "#fff" : "var(--ink)",
                              borderColor: "var(--route-green)",
                            }}
                            onClick={() => setFiltroTabelaQtd("com_quentinhas")}
                          >
                            ✓ Com Quentinhas ({rotas.filter((r) => r.quantidade > 0).length})
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: 11.5,
                              padding: "4px 10px",
                              fontWeight: filtroTabelaQtd === "zeradas" ? 700 : 500,
                              background: filtroTabelaQtd === "zeradas" ? "#F59E0B" : "#fff",
                              color: filtroTabelaQtd === "zeradas" ? "#fff" : "var(--ink)",
                              borderColor: "#F59E0B",
                            }}
                            onClick={() => setFiltroTabelaQtd("zeradas")}
                          >
                            ⏳ Aguardando ({rotas.filter((r) => r.quantidade === 0).length})
                          </button>
                        </div>

                        {/* Campo de Busca Rápida com Lupinha */}
                        <div style={{ position: "relative", marginBottom: 10 }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#8a8372",
                              fontSize: 14,
                              pointerEvents: "none",
                              lineHeight: 1,
                            }}
                          >
                            🔍
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar rota por local, cliente, motoboy ou status..."
                            value={buscaRotasDespachadas}
                            onChange={(e) => setBuscaRotasDespachadas(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 30px 8px 32px",
                              fontSize: 13,
                              border: "1px solid var(--line)",
                              borderRadius: 6,
                              background: "#fff",
                              boxSizing: "border-box",
                              outline: "none",
                            }}
                          />
                          {buscaRotasDespachadas && (
                            <button
                              type="button"
                              onClick={() => setBuscaRotasDespachadas("")}
                              style={{
                                position: "absolute",
                                right: 8,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                color: "#8a8372",
                                cursor: "pointer",
                                fontSize: 14,
                                padding: "2px 6px",
                              }}
                              title="Limpar busca"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="table-container">
                          <table className="responsive-table">
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
                              ) : rotasDespachadasFiltradas.length === 0 ? (
                                <tr>
                                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>
                                    Nenhuma rota encontrada para &quot;{buscaRotasDespachadas}&quot;.
                                  </td>
                                </tr>
                              ) : (
                                rotasDespachadasFiltradas.map((rota) => (
                                  <tr key={rota.id}>
                                    <td data-label="Local">
                                      <strong>{rota.local_nome}</strong>
                                      {rota.local_cliente_nome && (
                                        <div style={{ fontSize: 11.5, color: "#6b6558", marginTop: 2 }}>
                                          👤 {rota.local_cliente_nome}
                                        </div>
                                      )}
                                      {rota.local_endereco_link && (
                                        <div style={{ marginTop: 2 }}>
                                          <a
                                            href={rota.local_endereco_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: 11, color: "var(--route-green)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                                          >
                                            🗺️ Abrir Mapa
                                          </a>
                                        </div>
                                      )}
                                    </td>
                                    <td data-label="Motoboy">{rota.motoboy_nome}</td>
                                    <td data-label="Quantidade" className="num">
                                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={rota.quantidade}
                                          key={`rota-qtd-${rota.id}-${rota.quantidade}`}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              (e.target as HTMLInputElement).blur();
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            if (val !== rota.quantidade) {
                                              handleAtualizarQtdRapida(rota.id, val);
                                            }
                                          }}
                                          style={{
                                            width: 58,
                                            textAlign: "center",
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: "3px 4px",
                                            borderRadius: 5,
                                            border: rota.quantidade === 0 ? "1.5px dashed #F59E0B" : "1px solid var(--line)",
                                            background: rota.quantidade === 0 ? "#FEF3C7" : "#fff",
                                            color: rota.quantidade === 0 ? "#B45309" : "var(--ink)",
                                          }}
                                          title={rota.quantidade === 0 ? "Aguardando preenchimento da Dona Rê (0 un.)" : "Clique ou aperte Enter para alterar a quantidade"}
                                        />
                                        <span style={{ fontSize: 11, color: "#7a7364" }}>un.</span>
                                      </div>
                                      <div style={{ marginTop: 3 }}>
                                        {rota.carga_conferida ? (
                                          <span
                                            style={{
                                              background: "#DCFCE7",
                                              color: "#166534",
                                              border: "1px solid #86EFAC",
                                              fontSize: 10.5,
                                              fontWeight: 700,
                                              padding: "2px 6px",
                                              borderRadius: 4,
                                              display: "inline-block",
                                            }}
                                            title={`Placa conferida pelo motoboy${rota.carga_conferida_em ? ` às ${new Date(rota.carga_conferida_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
                                          >
                                            ✓ Placa OK
                                          </span>
                                        ) : (
                                          <span
                                            style={{
                                              background: "#F3F4F6",
                                              color: "#6B7280",
                                              border: "1px solid #E5E7EB",
                                              fontSize: 10,
                                              fontWeight: 500,
                                              padding: "2px 5px",
                                              borderRadius: 4,
                                              display: "inline-block",
                                            }}
                                            title="Aguardando o motoboy confirmar a placa"
                                          >
                                            Aguardando OK
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td data-label="Status">
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
                                    <td data-label="Ações" className="actions-cell" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                                        <button
                                          type="button"
                                          className="btn-whatsapp-sm"
                                          title="Encaminhar detalhes da rota para o WhatsApp do motoboy"
                                          onClick={() => handleEnviarRotaWhatsApp(rota)}
                                        >
                                          <span>💬</span> Zap
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "4px 8px", fontSize: 11 }}
                                          title="Editar local, entregador ou quantidade da rota"
                                          onClick={() => handleAbrirEditarRota(rota)}
                                        >
                                          ✏️ Editar
                                        </button>
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
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "4px 8px", fontSize: 11, color: "#991B1B", borderColor: "#FCA5A5" }}
                                          title="Excluir rota (criada errada ou cancelada pelo cliente)"
                                          onClick={() => setModalExcluirRota(rota)}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="perf"></div>

                    {/* Resumo Rápido de Relatórios */}
                    <div>
                      <div className="panel-title">
                        <span>Resumo Financeiro ({relPeriodoDescricao})</span>
                        <div className="filters" style={{ margin: 0 }}>
                          <button
                            className={relTipoFiltro === "hoje" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("hoje");
                              carregarRelatorioComFiltro("hoje");
                            }}
                          >
                            Hoje
                          </button>
                          <button
                            className={relTipoFiltro === "este_mes" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("este_mes");
                              carregarRelatorioComFiltro("este_mes");
                            }}
                          >
                            Este Mês
                          </button>
                          <button
                            className={relTipoFiltro === "tudo" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("tudo");
                              carregarRelatorioComFiltro("tudo");
                            }}
                          >
                            Tudo
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
                    <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <span>Gerenciamento de Locais ({locaisFiltrados.length})</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ position: "relative", display: "flex", alignItems: "center", background: "#fff", border: "1px solid var(--line)" }}>
                          <span style={{ padding: "0 6px 0 8px", color: "#8a8372", fontSize: 13 }}>🔍</span>
                          <input
                            type="text"
                            placeholder="Buscar local, cliente..."
                            value={termoBuscaLocais}
                            onChange={(e) => setTermoBuscaLocais(e.target.value)}
                            style={{ border: "none", outline: "none", padding: "6px 8px 6px 0", fontSize: 13, background: "transparent" }}
                          />
                          {termoBuscaLocais && (
                            <button
                              type="button"
                              onClick={() => setTermoBuscaLocais("")}
                              style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "0 6px", fontSize: 13 }}
                              title="Limpar busca"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <button className="btn" onClick={() => setModalLocalAberto(true)}>
                          + Adicionar local
                        </button>
                      </div>
                    </div>
                    <div className="table-container">
                      <table className="responsive-table">
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
                          {locaisFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#8a8372" }}>
                                {termoBuscaLocais ? `Nenhum local encontrado para "${termoBuscaLocais}".` : "Nenhum local cadastrado."}
                              </td>
                            </tr>
                          ) : (
                            locaisFiltrados.map((local) => (
                              <tr key={local.id}>
                                <td data-label="Local">
                                  <strong>{local.nome}</strong>
                                  {local.cliente_nome && (
                                    <div style={{ fontSize: 11.5, color: "#6b6558", marginTop: 2 }}>
                                      👤 {local.cliente_nome}
                                    </div>
                                  )}
                                </td>
                                <td data-label="Endereço" style={{ color: "#6b6558" }}>
                                  {local.endereco || "—"}
                                  {local.endereco_link && (
                                    <div style={{ marginTop: 3 }}>
                                      <a
                                        href={local.endereco_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: 11, color: "var(--route-green)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                                      >
                                        🗺️ Link Maps / Waze
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td data-label="Contato">{local.contato || "—"}</td>
                                <td data-label="Valor Unidade" className="num">
                                  R$ {Number(local.valor_unidade).toFixed(2)}
                                </td>
                                <td data-label="Status">
                                  <span className={`stamp ${local.ativo ? "ok" : "cancel"}`}>
                                    {local.ativo ? "ATIVO" : "INATIVO"}
                                  </span>
                                </td>
                                <td data-label="Ações" className="actions-cell" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: "4px 8px", fontSize: 11, marginRight: 6 }}
                                    title="Editar informações do local"
                                    onClick={() => handleAbrirEditarLocal(local)}
                                  >
                                    ✏️ Editar
                                  </button>
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
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. ABA: MOTOBOYS */}
                {adminTab === "motoboys" && (
                  <div>
                    {/* Cabeçalho */}
                    <div className="panel-title">
                      <span>Gerenciamento de Motoboys</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn" onClick={() => setModalMotoboyAberto(true)}>
                          + Adicionar motoboy
                        </button>
                      </div>
                    </div>

                    {/* Lista de motoboys com carteira expansível */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {motoboys.map((moto) => {
                        const carteiraAberta = carteiraExpandida === moto.id;
                        const itens = carteiras[moto.id] || [];
                        return (
                          <div key={moto.id} style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "#FFFDF9" }}>
                            {/* Linha do motoboy */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", flexWrap: "wrap" }}>
                              <div style={{ flex: 1, minWidth: 140 }}>
                                <strong style={{ fontSize: 14 }}>{moto.nome}</strong>
                                <span className="mono" style={{ fontSize: 11, color: "#6b6558", marginLeft: 8 }}>{moto.login}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#6b6558" }}>
                                Frete: <strong>R$ {Number(moto.valor_rota).toFixed(2)}</strong>
                              </div>
                              {moto.whatsapp && <div style={{ fontSize: 12, color: "#6b6558" }}>{moto.whatsapp}</div>}
                              <span className={`stamp ${moto.ativo ? "ok" : "cancel"}`} style={{ fontSize: 10 }}>
                                {moto.ativo ? "ATIVO" : "INATIVO"}
                              </span>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: 11, background: "#FFF8EC", borderColor: "var(--kraft)", color: "var(--kraft-dark)", fontWeight: 700 }}
                                  onClick={() => handleAbrirModalDespacho(moto)}
                                  title={`Despacho diário de ${moto.nome}`}
                                >
                                  🚀 Despachar
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: 11, background: carteiraAberta ? "var(--paper-alt)" : "#fff", fontWeight: 600 }}
                                  onClick={async () => {
                                    if (carteiraAberta) {
                                      setCarteiraExpandida(null);
                                    } else {
                                      setCarteiraExpandida(moto.id);
                                      if (!carteiras[moto.id]) await carregarCarteira(moto.id);
                                    }
                                  }}
                                >
                                  {carteiraAberta ? "▲ Fechar" : `📋 Carteira (${carteiras[moto.id]?.length ?? moto.total_locais ?? 0})`}
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: 11 }}
                                  onClick={() => { adminSimulatedMotoIdRef.current = moto.id; setAdminSimulatedMotoId(moto.id); setCurrentView("moto"); }}
                                >📱 App</button>
                                <button
                                  className="btn-secondary"
                                  style={{ fontSize: 11 }}
                                  onClick={() => { setMotoboyParaSenha(moto); setNovaSenha(""); setModalSenhaAberto(true); }}
                                >Senha</button>
                                <button
                                  className="btn-danger-link"
                                  style={{ fontSize: 11 }}
                                  onClick={() => setModalConfirmDelete({ tipo: "motoboy", id: moto.id, nome: moto.nome, ativo: moto.ativo })}
                                >{moto.ativo ? "Inativar" : "Excluir"}</button>
                              </div>
                            </div>

                            {/* Carteira expandida */}
                            {carteiraAberta && (
                              <div style={{ borderTop: "1px solid var(--line)", background: "#FAF7F0", padding: "14px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13 }}>📋 Carteira — {moto.nome}</span>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      className="btn-secondary"
                                      style={{ fontSize: 11 }}
                                      onClick={() => { setModalAddLocalCarteira(moto.id); setAddLocalCarteiraId(""); setAddLocalCarteiraQtd(0); }}
                                    >+ Adicionar local</button>
                                    <button
                                      className="btn"
                                      style={{ fontSize: 11, background: "var(--kraft)", borderColor: "var(--kraft)" }}
                                      disabled={despachando || itens.length === 0}
                                      onClick={() => handleAbrirModalDespacho(moto)}
                                      title="Abrir formulário de despacho do dia para preencher as quantidades"
                                    >
                                      {`🚀 Despachar (${dataFiltro.split("-").reverse().slice(0,2).join("/")})`}
                                    </button>
                                  </div>
                                </div>

                                {carregandoCarteira === moto.id ? (
                                  <div style={{ color: "#6b6558", fontSize: 13 }}>Carregando...</div>
                                ) : itens.length === 0 ? (
                                  <div style={{ color: "#6b6558", fontSize: 13, fontStyle: "italic", padding: "10px 0" }}>
                                    Carteira vazia. Clique em "+ Adicionar local" para começar.
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {itens.map((item, idx) => (
                                      <div
                                        key={item.id}
                                        draggable
                                        onDragStart={() => setDragItemIdx(idx)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                        onDrop={() => {
                                          if (dragItemIdx === null || dragItemIdx === idx) return;
                                          const nova = [...itens];
                                          const [moved] = nova.splice(dragItemIdx, 1);
                                          nova.splice(idx, 0, moved);
                                          setDragItemIdx(null);
                                          setDragOverIdx(null);
                                          handleSalvarOrdemCarteira(moto.id, nova);
                                        }}
                                        onDragEnd={() => { setDragItemIdx(null); setDragOverIdx(null); }}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          background: dragOverIdx === idx ? "#F0EBD8" : "#fff",
                                          border: "1px solid var(--line)",
                                          borderRadius: 6,
                                          padding: "8px 10px",
                                          cursor: "grab",
                                          transition: "background 0.12s",
                                        }}
                                      >
                                        <span style={{ color: "#bbb", fontSize: 13, userSelect: "none" }}>⠿</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kraft)", minWidth: 20, textAlign: "center" }}>
                                          {idx + 1}.
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.local_nome}
                                          </div>
                                          {item.local_cliente_nome && (
                                            <div style={{ fontSize: 11, color: "#6b6558" }}>{item.local_cliente_nome}</div>
                                          )}
                                        </div>
                                        {/* Quantidade padrão editável */}
                                        {editQtdId?.motoboyId === moto.id && editQtdId?.localId === item.local_id ? (
                                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <input
                                              type="number"
                                              value={editQtdVal}
                                              min={1}
                                              style={{ width: 56, padding: "3px 6px", border: "1px solid var(--kraft)", borderRadius: 4, fontSize: 12, fontWeight: 700 }}
                                              onChange={(e) => setEditQtdVal(Number(e.target.value))}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") handleSalvarQtdCarteira(moto.id, item.local_id, editQtdVal);
                                                if (e.key === "Escape") setEditQtdId(null);
                                              }}
                                              autoFocus
                                            />
                                            <button className="btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => handleSalvarQtdCarteira(moto.id, item.local_id, editQtdVal)}>✓</button>
                                            <button className="btn-secondary" style={{ fontSize: 10, padding: "3px 6px" }} onClick={() => setEditQtdId(null)}>✕</button>
                                          </div>
                                        ) : (
                                          <button
                                            title="Clique para editar a quantidade padrão"
                                            style={{ background: "#F5EBE6", border: "1px solid #E8C9B8", borderRadius: 4, padding: "3px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#7a4a30" }}
                                            onClick={() => { setEditQtdId({ motoboyId: moto.id, localId: item.local_id }); setEditQtdVal(item.qtd_padrao); }}
                                          >
                                            {item.qtd_padrao} un.
                                          </button>
                                        )}
                                        {item.local_endereco_link && (
                                          <a href={item.local_endereco_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--kraft)", textDecoration: "none" }} title="Ver no mapa">📍</a>
                                        )}
                                        <button
                                          title="Mover para cima"
                                          style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.25 : 1, fontSize: 12, padding: "2px 4px" }}
                                          disabled={idx === 0}
                                          onClick={() => {
                                            if (idx === 0) return;
                                            const nova = [...itens];
                                            [nova[idx - 1], nova[idx]] = [nova[idx], nova[idx - 1]];
                                            handleSalvarOrdemCarteira(moto.id, nova);
                                          }}
                                        >▲</button>
                                        <button
                                          title="Mover para baixo"
                                          style={{ background: "none", border: "none", cursor: idx === itens.length - 1 ? "default" : "pointer", opacity: idx === itens.length - 1 ? 0.25 : 1, fontSize: 12, padding: "2px 4px" }}
                                          disabled={idx === itens.length - 1}
                                          onClick={() => {
                                            if (idx === itens.length - 1) return;
                                            const nova = [...itens];
                                            [nova[idx], nova[idx + 1]] = [nova[idx + 1], nova[idx]];
                                            handleSalvarOrdemCarteira(moto.id, nova);
                                          }}
                                        >▼</button>
                                        <button
                                          title="Remover da carteira"
                                          className="btn-danger-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => handleRemoverLocalCarteira(moto.id, item.local_id)}
                                        >✕</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Modal: Adicionar local à carteira */}
                    {modalAddLocalCarteira !== null && (
                      <div
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={(e) => { if (e.target === e.currentTarget) setModalAddLocalCarteira(null); }}
                      >
                        <div style={{ background: "#FFFDF9", border: "2px solid var(--ink)", boxShadow: "6px 6px 0 rgba(0,0,0,0.15)", padding: "24px", borderRadius: 8, minWidth: 320, maxWidth: 440, width: "90%" }}>
                          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>+ Adicionar local à carteira</h3>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Local</label>
                            <select
                              value={addLocalCarteiraId}
                              onChange={(e) => setAddLocalCarteiraId(Number(e.target.value) || "")}
                              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}
                            >
                              <option value="">Selecione o local...</option>
                              {locais
                                .filter((l) => l.ativo)
                                .filter((l) => !carteiras[modalAddLocalCarteira]?.some((ml) => ml.local_id === l.id))
                                .map((l) => (
                                  <option key={l.id} value={l.id}>{l.nome}{l.cliente_nome ? ` — ${l.cliente_nome}` : ""}</option>
                                ))}
                            </select>
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Quantidade padrão</label>
                            <input
                              type="number"
                              min={1}
                              value={addLocalCarteiraQtd}
                              onChange={(e) => setAddLocalCarteiraQtd(Number(e.target.value))}
                              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-secondary" onClick={() => setModalAddLocalCarteira(null)}>Cancelar</button>
                            <button
                              className="btn"
                              disabled={adicionandoLocalCarteira || !addLocalCarteiraId}
                              onClick={() => handleAddLocalCarteira(modalAddLocalCarteira)}
                            >
                              {adicionandoLocalCarteira ? "Adicionando..." : "Adicionar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
          )
        )}

        {/* ======================= APP DO MOTOBOY ======================= */}
        {currentView === "moto" && (
          assinatura?.bloqueado ? (
            <div style={{ maxWidth: 460, margin: "40px auto 0", textAlign: "center" }}>
              <div
                className="panel-box"
                style={{
                  background: "#FFFDF9",
                  border: "2px solid var(--stamp-red)",
                  boxShadow: "6px 6px 0 var(--ink)",
                  padding: "36px 24px",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <h2 style={{ margin: "0 0 10px", fontSize: 20, color: "var(--stamp-red)" }}>
                  Sistema Temporariamente Suspenso
                </h2>
                <p style={{ fontSize: 14, color: "#6b6558", lineHeight: 1.5, margin: "0 0 18px" }}>
                  O sistema de entregas está suspenso aguardando renovação da licença mensal pela administração do restaurante.
                </p>
                <div
                  style={{
                    background: "#F7F3EA",
                    border: "1px solid var(--line)",
                    padding: "12px 16px",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#473d31",
                    marginBottom: 20,
                  }}
                >
                  Por favor, avise a <strong>Dona Rê</strong> para regularizar a mensalidade do sistema de rotas.
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px", fontSize: 13 }}
                  onClick={() => {
                    carregarAssinatura();
                    showToast("Verificando se o sistema foi liberado...");
                  }}
                >
                  ↻ Já foi pago / Atualizar liberação
                </button>
              </div>
            </div>
          ) : (
          <div className="phone-wrap">
            {/* Se for Admin simulando, mostra seletor */}
            {usuario.role === "admin" && (
              <div className="phone-selector-bar">
                <label style={{ fontSize: 13, color: "#6b6558" }}>Simular motoboy:</label>
                <select
                  style={{ padding: "6px 12px", border: "1px solid var(--line)", borderRadius: 6, background: "#fff", fontWeight: 600, fontSize: 13 }}
                  value={adminSimulatedMotoId ?? ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    adminSimulatedMotoIdRef.current = val;
                    setAdminSimulatedMotoId(val);
                  }}
                >
                  {motoboys.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} {!m.ativo ? "(Inativo)" : ""}
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
                    <span className="l">{dataFiltro === toLocalDateStr() ? "rotas hoje" : `rotas (${dataFiltro.split("-").reverse().slice(0, 2).join("/")})`}</span>
                  </div>
                  <div>
                    <span className="n">
                      {rotasMotoboyAtivo.reduce((acc, r) => acc + Number(r.quantidade), 0)}
                    </span>
                    <span className="l">quentinhas</span>
                  </div>
                </div>

                {/* ── Navegador de Histórico de Rotas para o Motoboy ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#FFFDF9",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    margin: "10px 0 14px",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>📅</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                      {dataFiltro === toLocalDateStr() ? "Hoje" : dataFiltro.split("-").reverse().join("/")}
                    </span>
                    {dataFiltro !== toLocalDateStr() && (
                      <span
                        style={{
                          fontSize: 10.5,
                          background: "#F5EBE6",
                          color: "var(--stamp-red)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        HISTÓRICO
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(dataFiltro + "T12:00:00");
                        d.setDate(d.getDate() - 1);
                        setDataFiltro(toLocalDateStr(d));
                      }}
                      title="Dia anterior"
                      style={{
                        padding: "5px 9px",
                        fontSize: 12,
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      ◀
                    </button>
                    {dataFiltro !== toLocalDateStr() && (
                      <button
                        type="button"
                        onClick={() => setDataFiltro(toLocalDateStr())}
                        style={{
                          padding: "5px 9px",
                          fontSize: 11.5,
                          border: "1px solid var(--kraft)",
                          borderRadius: 4,
                          background: "var(--kraft)",
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Hoje
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(dataFiltro + "T12:00:00");
                        d.setDate(d.getDate() + 1);
                        setDataFiltro(toLocalDateStr(d));
                      }}
                      title="Próximo dia"
                      style={{
                        padding: "5px 9px",
                        fontSize: 12,
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      ▶
                    </button>
                    <input
                      type="date"
                      value={dataFiltro}
                      onChange={(e) => e.target.value && setDataFiltro(e.target.value)}
                      style={{
                        padding: "4px 6px",
                        fontSize: 12,
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        maxWidth: 115,
                      }}
                    />
                  </div>
                </div>

                {/* Sub-Abas do Entregador: Resumo de Carga (Placas) vs Roteiro de Entregas */}
                <div className="m-subtabs-wrap">
                  <button
                    type="button"
                    className={`m-subtab-btn ${motoSubTab === "resumo" ? "active" : ""}`}
                    onClick={() => setMotoSubTab("resumo")}
                  >
                    <span>📋 Resumo de Carga (Placas)</span>
                  </button>
                  <button
                    type="button"
                    className={`m-subtab-btn ${motoSubTab === "roteiro" ? "active" : ""}`}
                    onClick={() => setMotoSubTab("roteiro")}
                  >
                    <span>🛵 Roteiro de Entregas</span>
                  </button>
                </div>

                {/* 1. ABA: RESUMO DE CARGA EM LISTA (PLACAS) */}
                {motoSubTab === "resumo" && (
                  <div className="stop-list">
                    <div
                      style={{
                        background: "#FFFDF9",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        fontSize: 12.5,
                        color: "#6b6558",
                        lineHeight: 1.4,
                      }}
                    >
                      🍱 <strong>Conferência de Placas:</strong> Veja a lista de locais e a quantidade de quentinhas a levar. Ao conferir e colocar as placas na moto, toque no botão <strong>OK</strong> para confirmar que pegou a carga.
                    </div>

                    {rotasMotoboyOrdenadas.length > 0 && (
                      <div style={{ position: "relative", marginBottom: 10 }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#8a8372",
                            fontSize: 14,
                            pointerEvents: "none",
                            lineHeight: 1,
                          }}
                        >
                          🔍
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar parada por local, cliente ou endereço..."
                          value={buscaRotasMotoboy}
                          onChange={(e) => setBuscaRotasMotoboy(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 30px 8px 32px",
                            fontSize: 13,
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            background: "#fff",
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                        />
                        {buscaRotasMotoboy && (
                          <button
                            type="button"
                            onClick={() => setBuscaRotasMotoboy("")}
                            style={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              color: "#8a8372",
                              cursor: "pointer",
                              fontSize: 14,
                              padding: "2px 6px",
                            }}
                            title="Limpar pesquisa"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {rotasMotoboyOrdenadas.length > 1 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          background: "#FFFBF2",
                          border: "1px dashed #E2D9C8",
                          borderRadius: 6,
                          marginBottom: 12,
                          fontSize: 12,
                          color: "#6b6558",
                        }}
                      >
                        <span>
                          ⇅ <strong>Organizar ordem:</strong> use ▲ / ▼ ou selecione a posição.
                          {buscaRotasMotoboy.trim() && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: "#8A5300", fontWeight: 600 }}>
                              ({rotasMotoboyExibidas.length} de {rotasMotoboyOrdenadas.length})
                            </span>
                          )}
                        </span>
                        {ordemRotasMotoIds.length > 0 && (
                          <button
                            type="button"
                            onClick={resetarOrdemRotas}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#8a8372",
                              fontSize: 11,
                              cursor: "pointer",
                              textDecoration: "underline",
                              fontWeight: 600,
                            }}
                            title="Restaurar ordem original"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    )}

                    {rotasMotoboyOrdenadas.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 16px", color: "#8a8372" }}>
                        Nenhum despacho atribuído a você hoje.
                      </div>
                    ) : rotasMotoboyExibidas.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "28px 16px",
                          background: "#FAF7EE",
                          border: "1px dashed var(--line)",
                          borderRadius: 8,
                          color: "#6b6558",
                          fontSize: 13,
                          marginBottom: 12,
                        }}
                      >
                        <div>Nenhuma parada encontrada para &quot;<strong>{buscaRotasMotoboy}</strong>&quot;.</div>
                        <button
                          type="button"
                          onClick={() => setBuscaRotasMotoboy("")}
                          style={{
                            marginTop: 8,
                            padding: "5px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            background: "#fff",
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: "var(--ink)",
                          }}
                        >
                          Limpar pesquisa
                        </button>
                      </div>
                    ) : (
                      rotasMotoboyExibidas.map((rota) => {
                        const isConferido = !!rota.carga_conferida;
                        const horaConferida = rota.carga_conferida_em
                          ? new Date(rota.carga_conferida_em).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : null;

                        const indexReal = rotasMotoboyOrdenadas.findIndex((r) => r.id === rota.id);
                        const numeroParada = indexReal !== -1 ? indexReal + 1 : 1;
                        const isPrimeira = indexReal === 0;
                        const isUltima = indexReal === rotasMotoboyOrdenadas.length - 1;

                        return (
                          <div
                            key={rota.id}
                            className="carga-card"
                            style={{
                              borderLeft: isConferido ? "4px solid #22C55E" : "4px solid var(--line)",
                            }}
                          >
                            <div className="carga-header">
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      background: "#F7F3EA",
                                      color: "#8A5300",
                                      border: "1px solid #FCD34D",
                                      padding: "2px 8px",
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {numeroParada}ª Parada
                                  </span>

                                  {rotasMotoboyOrdenadas.length > 1 && (
                                    <div style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        disabled={isPrimeira}
                                        onClick={() => moverOrdemRota(rota.id, "cima")}
                                        style={{
                                          padding: "2px 7px",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background: isPrimeira ? "#f0ece1" : "#fff",
                                          border: "1px solid var(--line)",
                                          borderRadius: 4,
                                          cursor: isPrimeira ? "not-allowed" : "pointer",
                                          color: isPrimeira ? "#b5af9f" : "var(--ink)",
                                          lineHeight: 1.2,
                                        }}
                                        title="Mover para cima (entregar antes)"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isUltima}
                                        onClick={() => moverOrdemRota(rota.id, "baixo")}
                                        style={{
                                          padding: "2px 7px",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background: isUltima ? "#f0ece1" : "#fff",
                                          border: "1px solid var(--line)",
                                          borderRadius: 4,
                                          cursor: isUltima ? "not-allowed" : "pointer",
                                          color: isUltima ? "#b5af9f" : "var(--ink)",
                                          lineHeight: 1.2,
                                        }}
                                        title="Mover para baixo (entregar depois)"
                                      >
                                        ▼
                                      </button>
                                      <select
                                        value={indexReal}
                                        onChange={(e) => reordenarRotaParaPosicao(rota.id, Number(e.target.value))}
                                        style={{
                                          padding: "2px 5px",
                                          fontSize: 11,
                                          border: "1px solid var(--line)",
                                          borderRadius: 4,
                                          background: "#fff",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                        title="Escolher número da parada"
                                      >
                                        {rotasMotoboyOrdenadas.map((_, idx) => (
                                          <option key={idx} value={idx}>
                                            {idx + 1}ª
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                <div className="carga-local-title">{rota.local_nome}</div>
                                {rota.local_cliente_nome && (
                                  <div style={{ fontSize: 12, color: "#6b6558", marginTop: 2 }}>
                                    👤 {rota.local_cliente_nome}
                                  </div>
                                )}
                              </div>
                              <span className={`stamp ${rota.status === "entregue" ? "ok" : "pend"}`}>
                                {rota.status}
                              </span>
                            </div>

                            <div className="carga-qty-display" style={rota.quantidade === 0 ? { background: "#FEF3C7", borderColor: "#FDE68A" } : undefined}>
                              <div>
                                <div style={{ fontSize: 11, color: rota.quantidade === 0 ? "#92400E" : "#7a7364", textTransform: "uppercase", fontWeight: 700 }}>
                                  {rota.quantidade === 0 ? "Status da Cozinha" : "Quantidade despachada"}
                                </div>
                                <div className="carga-qty-num" style={rota.quantidade === 0 ? { color: "#B45309", fontSize: 15 } : undefined}>
                                  {rota.quantidade === 0 ? (
                                    <span>⏳ Aguardando quentinhas da cozinha</span>
                                  ) : (
                                    <>
                                      {rota.quantidade} <span style={{ fontSize: 14, fontWeight: 500, color: "#7a7364" }}>quentinhas</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isConferido && (
                                <span
                                  style={{
                                    background: "#DCFCE7",
                                    color: "#166534",
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #86EFAC",
                                  }}
                                >
                                  ✓ OK
                                </span>
                              )}
                            </div>

                            {/* Botão de Confirmação OK */}
                            <div style={{ marginTop: 10 }}>
                              {rota.quantidade === 0 ? (
                                <div
                                  style={{
                                    padding: "10px 12px",
                                    background: "#FFFBEB",
                                    border: "1px dashed #FCD34D",
                                    borderRadius: 6,
                                    textAlign: "center",
                                    fontSize: 12.5,
                                    color: "#92400E",
                                    fontWeight: 600,
                                  }}
                                >
                                  ⏳ Aguardando a Dona Rê despachar a quantidade desta parada
                                </div>
                              ) : !isConferido ? (
                                <button
                                  type="button"
                                  className="btn"
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    padding: "11px 14px",
                                    background: "var(--route-green)",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 13.5,
                                    borderRadius: 6,
                                    border: "none",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                  }}
                                  onClick={() => handleToggleConferirCarga(rota.id, true)}
                                >
                                  <span>✓ OK — CONFIRMAR CARGA ({rota.quantidade} UN.)</span>
                                </button>
                              ) : (
                                <div
                                  style={{
                                    background: "#F0FDF4",
                                    border: "1px solid #BBF7D0",
                                    borderRadius: 6,
                                    padding: "9px 12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#166534" }}>
                                    ✓ Carga conferida! {horaConferida ? `(${horaConferida})` : ""}
                                  </span>
                                  <button
                                    type="button"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#15803D",
                                      fontSize: 11.5,
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                    onClick={() => handleToggleConferirCarga(rota.id, false)}
                                  >
                                    Desfazer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. ABA: ROTEIRO DE ENTREGAS DETALHADO */}
                {motoSubTab === "roteiro" && (
                  <div className="stop-list">
                    {rotasMotoboyOrdenadas.length > 0 && (
                      <div style={{ position: "relative", marginBottom: 10 }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#8a8372",
                            fontSize: 14,
                            pointerEvents: "none",
                            lineHeight: 1,
                          }}
                        >
                          🔍
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar parada por local, cliente ou endereço..."
                          value={buscaRotasMotoboy}
                          onChange={(e) => setBuscaRotasMotoboy(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 30px 8px 32px",
                            fontSize: 13,
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            background: "#fff",
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                        />
                        {buscaRotasMotoboy && (
                          <button
                            type="button"
                            onClick={() => setBuscaRotasMotoboy("")}
                            style={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              color: "#8a8372",
                              cursor: "pointer",
                              fontSize: 14,
                              padding: "2px 6px",
                            }}
                            title="Limpar pesquisa"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {rotasMotoboyOrdenadas.length > 1 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          background: "#FFFBF2",
                          border: "1px dashed #E2D9C8",
                          borderRadius: 6,
                          marginBottom: 12,
                          fontSize: 12,
                          color: "#6b6558",
                        }}
                      >
                        <span>
                          ⇅ <strong>Organizar roteiro:</strong> use ▲ / ▼ ou selecione a ordem.
                          {buscaRotasMotoboy.trim() && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: "#8A5300", fontWeight: 600 }}>
                              ({rotasMotoboyExibidas.length} de {rotasMotoboyOrdenadas.length})
                            </span>
                          )}
                        </span>
                        {ordemRotasMotoIds.length > 0 && (
                          <button
                            type="button"
                            onClick={resetarOrdemRotas}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#8a8372",
                              fontSize: 11,
                              cursor: "pointer",
                              textDecoration: "underline",
                              fontWeight: 600,
                            }}
                            title="Restaurar ordem original"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    )}

                    {rotasMotoboyOrdenadas.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 16px", color: "#8a8372" }}>
                        Nenhuma rota pendente para você no momento.
                      </div>
                    ) : rotasMotoboyExibidas.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "28px 16px",
                          background: "#FAF7EE",
                          border: "1px dashed var(--line)",
                          borderRadius: 8,
                          color: "#6b6558",
                          fontSize: 13,
                          marginBottom: 12,
                        }}
                      >
                        <div>Nenhuma parada encontrada para &quot;<strong>{buscaRotasMotoboy}</strong>&quot;.</div>
                        <button
                          type="button"
                          onClick={() => setBuscaRotasMotoboy("")}
                          style={{
                            marginTop: 8,
                            padding: "5px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            background: "#fff",
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: "var(--ink)",
                          }}
                        >
                          Limpar pesquisa
                        </button>
                      </div>
                    ) : (
                      rotasMotoboyExibidas.map((rota) => {
                        const isEntregue = rota.status === "entregue";
                        const isExpandido = rotaCardExpandidaId === rota.id;

                        const horaPassada = rota.criado_em
                          ? new Date(rota.criado_em).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—";

                        const horaEntregue = rota.entregue_em
                          ? new Date(rota.entregue_em).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : null;

                        const indexReal = rotasMotoboyOrdenadas.findIndex((r) => r.id === rota.id);
                        const numeroParada = indexReal !== -1 ? indexReal + 1 : 1;
                        const isPrimeira = indexReal === 0;
                        const isUltima = indexReal === rotasMotoboyOrdenadas.length - 1;

                        return (
                          <div
                            key={rota.id}
                            className={`stop ${isEntregue ? "delivered" : ""} ${isExpandido ? "expanded" : ""}`}
                            onClick={() => setRotaCardExpandidaId(isExpandido ? null : rota.id)}
                          >
                            <div className="stop-top">
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      background: isEntregue ? "#E2E8F0" : "#F7F3EA",
                                      color: isEntregue ? "#64748B" : "#8A5300",
                                      border: isEntregue ? "1px solid #CBD5E1" : "1px solid #FCD34D",
                                      padding: "2px 8px",
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {numeroParada}ª Parada
                                  </span>

                                  {rotasMotoboyOrdenadas.length > 1 && (
                                    <div
                                      style={{ display: "inline-flex", gap: 3, alignItems: "center" }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        disabled={isPrimeira}
                                        onClick={() => moverOrdemRota(rota.id, "cima")}
                                        style={{
                                          padding: "2px 7px",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background: isPrimeira ? "#f0ece1" : "#fff",
                                          border: "1px solid var(--line)",
                                          borderRadius: 4,
                                          cursor: isPrimeira ? "not-allowed" : "pointer",
                                          color: isPrimeira ? "#b5af9f" : "var(--ink)",
                                          lineHeight: 1.2,
                                        }}
                                        title="Mover para cima (entregar antes)"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isUltima}
                                        onClick={() => moverOrdemRota(rota.id, "baixo")}
                                        style={{
                                          padding: "2px 7px",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background: isUltima ? "#f0ece1" : "#fff",
                                          border: "1px solid var(--line)",
                                          borderRadius: 4,
                                          cursor: isUltima ? "not-allowed" : "pointer",
                                          color: isUltima ? "#b5af9f" : "var(--ink)",
                                          lineHeight: 1.2,
                                        }}
                                        title="Mover para baixo (entregar depois)"
                                      >
                                        ▼
                                      </button>
                                      <select
                                        value={indexReal}
                                        onChange={(e) => reordenarRotaParaPosicao(rota.id, Number(e.target.value))}
                                        style={{
                                          padding: "2px 5px",
                                          fontSize: 11,
                                          border: "1px solid var(--line)",
                                          borderRadius: 4,
                                          background: "#fff",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                        title="Escolher número da parada"
                                      >
                                        {rotasMotoboyOrdenadas.map((_, idx) => (
                                          <option key={idx} value={idx}>
                                            {idx + 1}ª
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <span className="loc">{rota.local_nome}</span>
                              </div>

                              <span className={`stamp ${isEntregue ? "ok" : "pend"}`}>
                                {rota.status}
                              </span>
                            </div>

                            {/* Destaque de Quantidade */}
                            <div className="m-qty-badge" style={rota.quantidade === 0 ? { background: "#FEF3C7", borderColor: "#FDE68A" } : undefined}>
                              <span style={rota.quantidade === 0 ? { color: "#92400E", fontWeight: 700 } : undefined}>
                                {rota.quantidade === 0 ? "Status:" : "Quantidade para entrega:"}
                              </span>
                              <span className="num-highlight" style={rota.quantidade === 0 ? { color: "#B45309", fontSize: 13 } : undefined}>
                                {rota.quantidade === 0 ? "⏳ Aguardando quentinhas da cozinha" : `${rota.quantidade} un.`}
                              </span>
                            </div>

                            {rota.carga_conferida ? (
                              <div style={{ background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", borderRadius: 6, padding: "4px 8px", fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>
                                ✓ Carga conferida na saída (OK)
                              </div>
                            ) : (
                              <div style={{ background: "#F3F4F6", color: "#4B5563", border: "1px dashed #D1D5DB", borderRadius: 6, padding: "4px 8px", fontSize: 11.5, fontWeight: 500, marginBottom: 8 }}>
                                ⏳ Pendente de conferência (verifique na aba de Resumo)
                              </div>
                            )}

                            {/* Dica / Botão de Expansão */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isExpandido ? 10 : 12 }}>
                              <span className="stop-expand-hint">
                                {isExpandido ? "▲ Toque para ocultar detalhes" : "▼ Toque para ver endereço e telefone"}
                              </span>
                              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#8a8372" }}>
                                Passada às {horaPassada}
                              </span>
                            </div>

                            {/* Seção Expandida com Detalhes Completos */}
                            {isExpandido && (
                              <div
                                className="stop-details-card"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {rota.local_cliente_nome && (
                                  <div className="stop-details-field">
                                    <span className="stop-details-label">
                                      👤 Quem vai receber:
                                    </span>
                                    <div className="stop-details-val" style={{ fontSize: 14, fontWeight: 700, color: "var(--kraft-dark)" }}>
                                      {rota.local_cliente_nome}
                                    </div>
                                  </div>
                                )}

                                <div className="stop-details-field">
                                  <span className="stop-details-label">
                                    📍 Endereço de Entrega:
                                  </span>
                                  <div className="stop-details-val" style={{ fontSize: 13.5 }}>
                                    {rota.local_endereco || "Endereço não cadastrado"}
                                  </div>
                                  {rota.local_endereco_link ? (
                                    <a
                                      href={rota.local_endereco_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "7px 12px",
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        marginTop: 8,
                                        textDecoration: "none",
                                        background: "var(--route-green)",
                                        color: "#fff",
                                        borderRadius: 3,
                                      }}
                                    >
                                      🗺️ Abrir Localização no Maps / Waze
                                    </a>
                                  ) : rota.local_endereco ? (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rota.local_endereco)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-secondary"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "4px 9px",
                                        fontSize: 11.5,
                                        marginTop: 6,
                                        textDecoration: "none",
                                        color: "var(--ink)",
                                      }}
                                    >
                                      🗺️ Abrir no GPS / Maps
                                    </a>
                                  ) : null}
                                </div>

                                <div className="stop-details-field">
                                  <span className="stop-details-label">
                                    📞 Telefone / Contato do Local:
                                  </span>
                                  {rota.local_contato ? (
                                    <div>
                                      <div className="stop-details-val" style={{ fontSize: 13.5 }}>
                                        {rota.local_contato}
                                      </div>
                                      <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                                        <a
                                          href={`tel:${rota.local_contato.replace(/\D/g, "")}`}
                                          className="btn-secondary"
                                          style={{
                                            padding: "3px 8px",
                                            fontSize: 11,
                                            textDecoration: "none",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                          }}
                                        >
                                          📞 Ligar
                                        </a>
                                        {(() => {
                                          const cleanPhone = rota.local_contato.replace(/\D/g, "");
                                          const waPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
                                          return (
                                            <a
                                              href={`https://wa.me/${waPhone}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="btn-secondary"
                                              style={{
                                                padding: "3px 8px",
                                                fontSize: 11,
                                                textDecoration: "none",
                                                color: "#166534",
                                                fontWeight: 600,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                              }}
                                            >
                                              💬 WhatsApp
                                            </a>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ color: "#8a8372", fontSize: 12, fontStyle: "italic" }}>
                                      Telefone não informado no cadastro
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 8 }}>
                                  <div>
                                    <span className="stop-details-label">
                                      🕒 Horário que foi passada:
                                    </span>
                                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 12.5 }}>
                                      {horaPassada}
                                    </span>
                                  </div>

                                  {horaEntregue && (
                                    <div style={{ textAlign: "right" }}>
                                      <span className="stop-details-label" style={{ color: "#166534", justifyContent: "flex-end" }}>
                                        ✓ Entregue às:
                                      </span>
                                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, fontSize: 12.5, color: "#166534" }}>
                                        {horaEntregue}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Botão de Entrega */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {rota.quantidade === 0 ? (
                                <div
                                  style={{
                                    padding: "9px 12px",
                                    background: "#FFFBEB",
                                    border: "1px dashed #FCD34D",
                                    borderRadius: 6,
                                    textAlign: "center",
                                    fontSize: 12,
                                    color: "#92400E",
                                    fontWeight: 600,
                                  }}
                                >
                                  ⏳ Aguardando a Dona Rê despachar a quantidade
                                </div>
                              ) : !isEntregue ? (
                                <button
                                  className="btn-delivery-action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAlterarStatusRota(rota.id, "entregue");
                                  }}
                                >
                                  <span>✓ CONFIRMAR ENTREGA</span>
                                </button>
                              ) : (
                                <div className="delivered-status-box">
                                  <span>✓ Entrega Concluída! {horaEntregue ? `(${horaEntregue})` : ""}</span>
                                  <button
                                    className="btn-undo-link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAlterarStatusRota(rota.id, "pendente");
                                    }}
                                  >
                                    Desfazer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <div className="m-footnote">
                  {motoSubTab === "resumo"
                    ? "Confira as quentinhas nas placas antes de sair para as rotas"
                    : rotasMotoboyOrdenadas.length > 0
                    ? "Toque no botão verde assim que realizar a entrega"
                    : "Aguardando novos despachos da Dona Rê"}
                </div>
              </div>
            </div>
          </div>
          )
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
                <label>Nome do cliente / Quem vai receber (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Sr. Francinaldo, Cantina CCH..."
                  value={novoLocalClienteNome}
                  onChange={(e) => setNovoLocalClienteNome(e.target.value)}
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
                <label>Link da Localização Maps / Waze (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: https://maps.app.goo.gl/... ou link compartilhado"
                  value={novoLocalEnderecoLink}
                  onChange={(e) => setNovoLocalEnderecoLink(e.target.value)}
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

      {/* Modal: Editar Local */}
      {modalEditarLocalAberto && localParaEditar && (
        <div className="modal-overlay" onClick={() => setModalEditarLocalAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Editar Local: {localParaEditar.nome}</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalEditarLocalAberto(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSalvarEdicaoLocal}>
              <div className="field">
                <label>Nome do Local / Ponto</label>
                <input
                  type="text"
                  placeholder="Ex: Zona Leste — UFPI"
                  value={editLocalNome}
                  onChange={(e) => setEditLocalNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Nome do cliente / Quem vai receber (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Sr. Francinaldo, Cantina CCH..."
                  value={editLocalClienteNome}
                  onChange={(e) => setEditLocalClienteNome(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Endereço / Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Prédio CCH, Cantina"
                  value={editLocalEndereco}
                  onChange={(e) => setEditLocalEndereco(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Link da Localização Maps / Waze (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: https://maps.app.goo.gl/... ou link compartilhado"
                  value={editLocalEnderecoLink}
                  onChange={(e) => setEditLocalEnderecoLink(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Contato</label>
                <input
                  type="text"
                  placeholder="(86) 99999-9999"
                  value={editLocalContato}
                  onChange={(e) => setEditLocalContato(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Valor cobrado por quentinha (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={editLocalValor}
                  onChange={(e) => setEditLocalValor(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalEditarLocalAberto(false)}
                  disabled={salvandoEdicaoLocal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={salvandoEdicaoLocal}>
                  {salvandoEdicaoLocal ? "Salvando..." : "Salvar Alterações"}
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
                <label>WhatsApp / Celular (com DDD)</label>
                <input
                  type="tel"
                  placeholder="Ex: 86999998888"
                  value={novoMotoWhatsapp}
                  onChange={(e) => setNovoMotoWhatsapp(e.target.value)}
                />
                <span style={{ fontSize: 11, color: "#6b6558" }}>
                  Permite encaminhar detalhes de entrega direto no WhatsApp dele com 1 clique.
                </span>
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

      {/* Modal: Despacho Rápido da Carteira por Motoboy */}
      {modalDespachoMoto && (
        <div className="modal-overlay" onClick={() => setModalDespachoMoto(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: 540, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>🚀 Despacho Diário — {modalDespachoMoto.nome}</h3>
                <div style={{ fontSize: 12, color: "#6b6558", marginTop: 2 }}>
                  Data: <strong>{dataFiltro.split("-").reverse().join("/")}</strong> • {despachoItens.length} paradas na carteira
                </div>
              </div>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
                onClick={() => setModalDespachoMoto(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "10px 0 6px 0", fontSize: 12, color: "#8a8372" }}>
              Preencha a quantidade de quentinhas para cada local hoje. (Locais com <strong>0</strong> permanecem na rota aguardando despacho).
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 6, margin: "6px 0 14px 0" }}>
              {despachoItens.map((item, idx) => (
                <div
                  key={item.local_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 12px",
                    background: item.quantidade > 0 ? "#F0FDF4" : "#FAF7F0",
                    border: item.quantidade > 0 ? "1px solid #BBF7D0" : "1px solid var(--line)",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kraft)", minWidth: 20 }}>
                      {idx + 1}ª
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.local_nome}
                      </div>
                      {item.local_cliente_nome && (
                        <div style={{ fontSize: 11, color: "#6b6558" }}>
                          👤 {item.local_cliente_nome}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      min="0"
                      value={item.quantidade}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDespachoItens((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, quantidade: val } : it))
                        );
                      }}
                      style={{
                        width: 64,
                        textAlign: "center",
                        padding: "6px 8px",
                        fontSize: 14,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: item.quantidade > 0 ? "1.5px solid #16A34A" : "1px solid var(--line)",
                        background: "#fff",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#6b6558" }}>un.</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totalizador e Rodapé */}
            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#6b6558", textTransform: "uppercase" }}>Total Despachado</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--route-green)" }}>
                  {despachoItens.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0)}{" "}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#6b6558" }}>quentinhas</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalDespachoMoto(null)}
                  disabled={salvandoDespachoRapido}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: "var(--route-green)", borderColor: "var(--route-green)" }}
                  disabled={salvandoDespachoRapido}
                  onClick={handleConfirmarDespachoRapido}
                >
                  {salvandoDespachoRapido ? "Salvando..." : "🚀 Confirmar Despacho"}
                </button>
              </div>
            </div>
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

      {/* Modal: Editar Rota Despachada */}
      {modalEditarRotaAberto && rotaParaEditar && (
        <div className="modal-overlay" onClick={() => setModalEditarRotaAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Editar Rota #{rotaParaEditar.id}</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalEditarRotaAberto(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSalvarEdicaoRota}>
              <SearchableSelect
                label="Local de entrega"
                placeholder="Buscar ou selecionar local..."
                options={locaisOptions}
                value={editRotaLocalId}
                onChange={(id) => setEditRotaLocalId(id)}
                required
              />

              <SearchableSelect
                label="Motoboy responsável"
                placeholder="Buscar ou selecionar motoboy..."
                options={motoboysOptions}
                value={editRotaMotoboyId}
                onChange={(id) => setEditRotaMotoboyId(id)}
                required
              />

              <div className="field">
                <label>Quantidade de quentinhas</label>
                <input
                  type="number"
                  min="0"
                  value={editRotaQtd}
                  onChange={(e) => setEditRotaQtd(parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="modal-footer-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ color: "var(--stamp-red)", borderColor: "#FCA5A5", fontSize: 12 }}
                  onClick={() => setModalExcluirRota(rotaParaEditar)}
                  disabled={salvandoEdicaoRota}
                >
                  🗑️ Excluir Rota
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModalEditarRotaAberto(false)}
                    disabled={salvandoEdicaoRota}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn" disabled={salvandoEdicaoRota}>
                    {salvandoEdicaoRota ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Rota */}
      {modalExcluirRota && (
        <div className="modal-overlay" onClick={() => setModalExcluirRota(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 style={{ color: "var(--stamp-red)" }}>Excluir Rota #{modalExcluirRota.id}</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalExcluirRota(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 14, margin: "14px 0", lineHeight: 1.5 }}>
              Deseja realmente excluir a rota de{" "}
              <strong>&quot;{modalExcluirRota.local_nome}&quot;</strong> com o entregador{" "}
              <strong>&quot;{modalExcluirRota.motoboy_nome}&quot;</strong> (<strong>{modalExcluirRota.quantidade} quentinhas</strong>)?
            </p>
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6, padding: "10px 12px", fontSize: 12.5, color: "#991B1B", marginBottom: 16 }}>
              ⚠️ <strong>Atenção:</strong> Essa rota será apagada definitivamente do sistema. Os totais e relatórios financeiros serão recalculados automaticamente. Use esta opção caso a rota tenha sido despachada por engano ou cancelada pelo cliente.
            </div>
            <div className="modal-footer-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalExcluirRota(null)}
                disabled={excluindoRota}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "var(--stamp-red)" }}
                disabled={excluindoRota}
                onClick={() => handleConfirmarExcluirRota(modalExcluirRota.id)}
              >
                {excluindoRota ? "Excluindo..." : "Excluir Rota Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhes da Assinatura (AbacatePay) */}
      {modalAssinaturaAberto && assinatura && (
        <div className="modal-overlay" onClick={() => setModalAssinaturaAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Licença Quentinhas da Rê</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                onClick={() => setModalAssinaturaAberto(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "8px 0" }}>
              <div
                style={{
                  background: "#F7F3EA",
                  border: "1px solid var(--line)",
                  padding: "14px",
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Status da licença:</span>
                  <span
                    className={`stamp ${
                      assinatura.bloqueado ? "cancel" : assinatura.em_tolerancia ? "pend" : "ok"
                    }`}
                  >
                    {assinatura.bloqueado
                      ? "BLOQUEADO"
                      : assinatura.em_tolerancia
                      ? "EM TOLERÂNCIA (1 DIA)"
                      : "ATIVO (EM DIA)"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Valor da mensalidade:</span>
                  <strong style={{ fontSize: 15, color: "var(--route-green)" }}>R$ {assinatura.valor_mensal.toFixed(2)} / mês</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Forma de pagamento:</span>
                  <strong>Pix</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Próximo vencimento:</span>
                  <strong>
                    {assinatura.vence_em
                      ? new Date(assinatura.vence_em).toLocaleDateString("pt-BR")
                      : "15/10/2026"}{" "}
                    ({assinatura.dias_restantes > 0 ? `${assinatura.dias_restantes} dias restantes` : "Vencido"})
                  </strong>
                </div>
              </div>

              {abacatePayErro && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    color: "#991B1B",
                    padding: "10px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 14,
                    lineHeight: 1.45,
                  }}
                >
                  <strong>⚠️ Aviso da Cobrança:</strong>
                  <div>{abacatePayErro}</div>
                </div>
              )}

              <div
                style={{
                  background: "#F7F3EA",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 16,
                  fontSize: 12.5,
                  color: "#473d31",
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>ℹ️</span> Informações de Renovação:
                </div>
                <div style={{ marginBottom: 4 }}>
                  • O valor da mensalidade mantém o sistema sempre liberado com suporte, atualizações e sincronização em tempo real.
                </div>
                <div>
                  • O pagamento é processado instantaneamente via <strong>Pix</strong> de forma rápida e segura.
                </div>
              </div>

              <div className="modal-footer-row" style={{ marginTop: 0, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn"
                  disabled={gerandoAbacatePay}
                  onClick={handlePagarAbacatePay}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    background: "var(--route-green)",
                    cursor: gerandoAbacatePay ? "wait" : "pointer",
                  }}
                >
                  {gerandoAbacatePay ? "⏳ Gerando Pix..." : `⚡ Pagar R$ ${assinatura.valor_mensal.toFixed(2)} via Pix`}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalAssinaturaAberto(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: QR Code Pix Direto (Sem Formulário de Cadastro) */}
      {dadosPixModal && (
        <div className="modal-overlay" onClick={() => setDadosPixModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, textAlign: "center" }}>
            <div className="modal-header-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "var(--ink)" }}>
                ⚡ Pagamento via Pix
              </h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b6558" }}
                onClick={() => setDadosPixModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--route-green)", marginBottom: 4 }}>
                R$ {dadosPixModal.valor}
              </div>
              <p style={{ fontSize: 13, color: "#6b6558", margin: "0 0 14px", lineHeight: 1.4 }}>
                Abra o aplicativo do seu banco e escaneie o QR Code abaixo:
              </p>

              {dadosPixModal.qrCodeImage && (
                <div
                  style={{
                    background: "#fff",
                    border: "2px solid var(--line)",
                    borderRadius: 12,
                    padding: 12,
                    display: "inline-block",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                    marginBottom: 16,
                  }}
                >
                  <img
                    src={dadosPixModal.qrCodeImage}
                    alt="QR Code Pix"
                    style={{ width: 210, height: 210, display: "block" }}
                  />
                </div>
              )}

              <div style={{ textAlign: "left", marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b6558", display: "block", marginBottom: 4 }}>
                  Ou pague pelo Pix Copia e Cola:
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    readOnly
                    value={dadosPixModal.brCode}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    style={{
                      width: "100%",
                      fontSize: 11,
                      padding: "8px 10px",
                      background: "#F7F3EA",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      color: "#473d31",
                      fontFamily: "monospace",
                    }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      navigator.clipboard.writeText(dadosPixModal.brCode);
                      setPixCopiado(true);
                      showToast("✓ Código Pix copiado para a área de transferência!");
                      setTimeout(() => setPixCopiado(false), 3000);
                    }}
                    style={{
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      background: pixCopiado ? "#15803D" : "var(--ink)",
                    }}
                  >
                    {pixCopiado ? "✓ Copiado!" : "📋 Copiar"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  color: "#166534",
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontSize: 12,
                  marginBottom: 16,
                  lineHeight: 1.4,
                  textAlign: "left",
                }}
              >
                ✓ <strong>Liberação Automática:</strong> Assim que você pagar no banco, o sistema reconhece a compensação e libera o acesso na hora.
              </div>

              <div className="modal-footer-row" style={{ marginTop: 0, display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 13, padding: "9px 16px", background: "var(--route-green)" }}
                  onClick={() => {
                    carregarAssinatura();
                    showToast("Verificando se o Pix foi compensado...");
                  }}
                >
                  ↻ Já paguei / Atualizar Liberação
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: "9px 16px" }}
                  onClick={() => setDadosPixModal(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
