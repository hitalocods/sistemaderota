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

  // Assinatura e Licença (PagBank - R$ 65/mês)
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

  // Dados do Sistema
  const [locais, setLocais] = useState<Local[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
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
  const [novaRotaQtd, setNovaRotaQtd] = useState<number>(30);
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
  const [editRotaQtd, setEditRotaQtd] = useState<number>(30);
  const [salvandoEdicaoRota, setSalvandoEdicaoRota] = useState(false);

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

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Consulta de Status da Assinatura / Licença (PagBank)
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
    if (!rotaParaEditar || !editRotaLocalId || !editRotaMotoboyId || !editRotaQtd) {
      showToast("Preencha local, motoboy e quantidade!");
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
                  A mensalidade de uso do sistema está pendente. Para continuar gerenciando rotas, entregas e relatórios normalmente, regularize sua assinatura.
                </p>

                <div
                  style={{
                    background: "#F7F3EA",
                    border: "1px solid var(--line)",
                    padding: "16px",
                    marginBottom: 24,
                    borderRadius: 4,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: "#6b6558" }}>Plano:</span>
                    <strong>Licença Quentinhas da Rê</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: "#6b6558" }}>Valor mensal:</span>
                    <strong style={{ fontSize: 16, color: "var(--ink)" }}>R$ {assinatura.valor_mensal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span style={{ color: "#6b6558" }}>Forma de cobrança:</span>
                    <span>Débito Automático no Cartão</span>
                  </div>
                </div>

                <a
                  href={assinatura.link_pagamento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "14px",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    marginBottom: 12,
                    background: "var(--route-green)",
                  }}
                >
                  💳 Regularizar Assinatura no Cartão (R$ {assinatura.valor_mensal.toFixed(2)})
                </a>

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
                <button
                  className={adminTab === "relatorios" ? "active" : ""}
                  onClick={() => setAdminTab("relatorios")}
                >
                  Relatórios
                </button>
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
                              ) : (
                                rotas.map((rota) => (
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
                                    <td data-label="Quantidade" className="num">{rota.quantidade} un.</td>
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
                                      </div>
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
                    <div className="panel-title">
                      <span>Gerenciamento de Motoboys</span>
                      <button className="btn" onClick={() => setModalMotoboyAberto(true)}>
                        + Adicionar motoboy
                      </button>
                    </div>
                    <div className="table-container">
                      <table className="responsive-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Login</th>
                            <th>WhatsApp</th>
                            <th className="num">Valor por rota</th>
                            <th>Status</th>
                            <th style={{ textAlign: "right" }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {motoboys.map((moto) => (
                            <tr key={moto.id}>
                              <td data-label="Nome">
                                <strong>{moto.nome}</strong>
                              </td>
                              <td data-label="Login" className="mono">{moto.login}</td>
                              <td data-label="WhatsApp" style={{ color: "#3d392e" }}>{moto.whatsapp || "—"}</td>
                              <td data-label="Taxa por rota" className="num">
                                R$ {Number(moto.valor_rota).toFixed(2)}
                              </td>
                              <td data-label="Status">
                                <span className={`stamp ${moto.ativo ? "ok" : "cancel"}`}>
                                  {moto.ativo ? "ATIVO" : "INATIVO"}
                                </span>
                              </td>
                              <td data-label="Ações" className="actions-cell" style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ fontSize: 11, background: "#fff" }}
                                    title={`Abrir simulador do App com ${moto.nome}`}
                                    onClick={() => {
                                      adminSimulatedMotoIdRef.current = moto.id;
                                      setAdminSimulatedMotoId(moto.id);
                                      setCurrentView("moto");
                                    }}
                                  >
                                    📱 Ver App
                                  </button>
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
                        <div className="filters" style={{ margin: 0, flexWrap: "wrap", gap: 6 }}>
                          <button
                            type="button"
                            className={relTipoFiltro === "hoje" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("hoje");
                              carregarRelatorioComFiltro("hoje");
                            }}
                          >
                            Hoje
                          </button>
                          <button
                            type="button"
                            className={relTipoFiltro === "dia_especifico" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("dia_especifico");
                              carregarRelatorioComFiltro("dia_especifico", relDiaEscolhido);
                            }}
                          >
                            Escolher Dia
                          </button>
                          <button
                            type="button"
                            className={relTipoFiltro === "este_mes" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("este_mes");
                              carregarRelatorioComFiltro("este_mes");
                            }}
                          >
                            Este Mês
                          </button>
                          <button
                            type="button"
                            className={relTipoFiltro === "mes_especifico" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("mes_especifico");
                              carregarRelatorioComFiltro("mes_especifico", undefined, relMesEscolhido);
                            }}
                          >
                            Escolher Mês
                          </button>
                          <button
                            type="button"
                            className={relTipoFiltro === "ano" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("ano");
                              carregarRelatorioComFiltro("ano", undefined, undefined, relAnoEscolhido);
                            }}
                          >
                            Ano ({relAnoEscolhido})
                          </button>
                          <button
                            type="button"
                            className={relTipoFiltro === "tudo" ? "active" : ""}
                            onClick={() => {
                              setRelTipoFiltro("tudo");
                              carregarRelatorioComFiltro("tudo");
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

                    {/* Controles Dinâmicos quando o usuário escolhe Dia ou Mês específico */}
                    <div className="filter-subbar">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: "#6b6558" }}>Período filtrado:</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--ink)",
                            background: "var(--paper-alt)",
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "1px solid var(--line)",
                          }}
                        >
                          {relPeriodoDescricao}
                        </span>

                        {relTipoFiltro === "dia_especifico" && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "#6b6558" }}>Selecionar data:</label>
                            <input
                              type="date"
                              value={relDiaEscolhido}
                              onChange={(e) => {
                                setRelDiaEscolhido(e.target.value);
                                carregarRelatorioComFiltro("dia_especifico", e.target.value);
                              }}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid var(--line)",
                                background: "#fff",
                                fontSize: 13,
                              }}
                            />
                          </div>
                        )}

                        {relTipoFiltro === "mes_especifico" && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "#6b6558" }}>Selecionar mês:</label>
                            <input
                              type="month"
                              value={relMesEscolhido}
                              onChange={(e) => {
                                setRelMesEscolhido(e.target.value);
                                carregarRelatorioComFiltro("mes_especifico", undefined, e.target.value);
                              }}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid var(--line)",
                                background: "#fff",
                                fontSize: 13,
                              }}
                            />
                          </div>
                        )}

                        {relTipoFiltro === "ano" && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "#6b6558" }}>Ano:</label>
                            <select
                              value={relAnoEscolhido}
                              onChange={(e) => {
                                setRelAnoEscolhido(e.target.value);
                                carregarRelatorioComFiltro("ano", undefined, undefined, e.target.value);
                              }}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid var(--line)",
                                background: "#fff",
                                fontSize: 13,
                              }}
                            >
                              <option value="2026">2026</option>
                              <option value="2025">2025</option>
                              <option value="2024">2024</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: 11.5, color: "#7a7364" }}>
                        Valores calculados em tempo real
                      </span>
                    </div>

                    {/* Cards de Métricas Operacionais e Financeiras */}
                    <div className="cards cards-5">
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
                        <table className="responsive-table">
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
                                      <td data-label="Entregador">
                                        <span className="accordion-arrow">
                                          {isOpen ? "▼" : "▶"}
                                        </span>
                                        <strong>{m.nome}</strong>
                                      </td>
                                      <td data-label="Rotas" className="num">{m.rotas} rotas</td>
                                      <td data-label="Quentinhas" className="num" style={{ fontWeight: 700 }}>
                                        {m.quentinhas} un.
                                      </td>
                                      <td data-label="A Receber" className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>
                                        R$ {Number(m.custo).toFixed(2)}
                                      </td>
                                      <td data-label="Ações" className="actions-cell" style={{ textAlign: "center" }}>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "4px 10px", fontSize: 11 }}
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
                                          <div style={{ padding: "10px 14px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#5a5548" }}>
                                              📋 Extrato de entregas de {m.nome} no período ({rotasDesteMotoboy.length} entregas concluídas):
                                            </div>

                                            {rotasDesteMotoboy.length === 0 ? (
                                              <div style={{ padding: 12, color: "#8a8372", fontSize: 12, textAlign: "center" }}>
                                                Nenhuma rota entregue por este motoboy no período selecionado.
                                              </div>
                                            ) : (
                                              <table className="sub-routes-table responsive-subtable">
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
                                                        <td data-label="Data" style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                                                          {dataFormatada}
                                                        </td>
                                                        <td data-label="Horário" style={{ color: "#6b6558" }}>
                                                          {horaFormatada}
                                                        </td>
                                                        <td data-label="Destino">
                                                          <strong>{r.local_nome}</strong>
                                                        </td>
                                                        <td data-label="Quantidade" className="num" style={{ fontWeight: 700 }}>
                                                          {r.quantidade} quentinhas
                                                        </td>
                                                        <td data-label="Taxa" className="num" style={{ fontWeight: 600 }}>
                                                          R$ {Number(r.custo).toFixed(2)}
                                                        </td>
                                                        <td data-label="Status" style={{ textAlign: "center" }}>
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
                        <table className="responsive-table">
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
                                  <td data-label="Ponto de Entrega">
                                    <strong>{l.nome}</strong>
                                  </td>
                                  <td data-label="Quentinhas" className="num">{l.quentinhas} un.</td>
                                  <td data-label="Receita Gerada" className="num" style={{ fontWeight: 700, color: "var(--route-green)" }}>
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
          )
        )}

        {/* ======================= APP DO MOTOBOY ======================= */}
        {currentView === "moto" && (
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

                      return (
                        <div
                          key={rota.id}
                          className={`stop ${isEntregue ? "delivered" : ""} ${isExpandido ? "expanded" : ""}`}
                          onClick={() => setRotaCardExpandidaId(isExpandido ? null : rota.id)}
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
                            {!isEntregue ? (
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
                  min="1"
                  value={editRotaQtd}
                  onChange={(e) => setEditRotaQtd(parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="modal-footer-row">
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
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalhes da Assinatura (PagBank) */}
      {modalAssinaturaAberto && assinatura && (
        <div className="modal-overlay" onClick={() => setModalAssinaturaAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Licença Atlas</h3>
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
                  borderRadius: 4,
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
                      ? "EM TOLERÂNCIA"
                      : "ATIVO (EM DIA)"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Valor da mensalidade:</span>
                  <strong style={{ fontSize: 15 }}>R$ {assinatura.valor_mensal.toFixed(2)} / mês</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Cobrança recorrente:</span>
                  <span>Débito no Cartão de Crédito</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Dia de vencimento:</span>
                  <strong>Todo dia 15</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: "#6b6558" }}>Próxima renovação:</span>
                  <strong>
                    {assinatura.vence_em
                      ? new Date(assinatura.vence_em).toLocaleDateString("pt-BR")
                      : "15/10/2026"}{" "}
                    ({assinatura.dias_restantes > 0 ? `${assinatura.dias_restantes} dias restantes` : "Vencido"})
                  </strong>
                </div>
              </div>

              <div
                style={{
                  background: "#F7F3EA",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  padding: "12px 14px",
                  marginBottom: 16,
                  fontSize: 12.5,
                  color: "#473d31",
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>ℹ️</span> Regras de Renovação e Cancelamento:
                </div>
                <div style={{ marginBottom: 6 }}>
                  • O valor é debitado <strong>automaticamente todo mês</strong> no cartão cadastrado para manter o sistema sempre liberado.
                </div>
                <div>
                  • Você pode cancelar a qualquer momento. Para <strong>evitar a cobrança automática do mês seguinte</strong>, solicite o cancelamento com pelo menos <strong>10 dias de antecedência</strong> do vencimento.
                </div>
              </div>

              <div className="modal-footer-row" style={{ marginTop: 0 }}>
                {/* BOTÃO DE PAGAMENTO (DESATIVADO TEMPORARIAMENTE - DESCOMENTE QUANDO QUISER REATIVAR)
                <a
                  href={assinatura.link_pagamento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  💳 Gerenciar Assinatura / Cartão
                </a>
                */}
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
    </div>
  );
}
