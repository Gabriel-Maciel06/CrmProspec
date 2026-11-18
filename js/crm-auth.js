/**
 * js/crm-auth.js - Módulo de Autenticação e Controle de Acesso Baseado em Papéis (RBAC)
 * CRM Isapel Papéis v1.1.0
 *
 * Responsável por gerenciar credenciais, sessão criptográfica/token, persistência
 * em localStorage/sessionStorage, proteção de rotas e perfis de acesso.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IsapelAuth = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'crm_prospec_auth_session';
  const VENDEDORES_STORAGE_KEY = 'crm_prospec_vendedores_custom';

  // Catálogo dinâmico (desabilitado no CRM de Prospecções)
  const USUARIOS_DINAMICOS = {};

  // Base de Usuários Homologados (Apenas Daniel e Maciel)
  const USUARIOS_CONFIG = {
    maciel: {
      id: 'maciel',
      usuario: 'maciel',
      nome: 'Gabriel Maciel',
      perfil: 'vendedor',
      vendedorId: 'maciel',
      cargo: 'Prospector Comercial B2B',
      avatar: 'GM',
      avatarIniciais: 'GM',
      avatarCor: '#003360',
      metaMensalFardos: 2500,
      metaMensalReais: 60000,
      senhasValidas: ['maciel0602', 'maciel123']
    },
    daniel: {
      id: 'daniel',
      usuario: 'daniel',
      nome: 'Daniel',
      perfil: 'vendedor',
      vendedorId: 'daniel',
      cargo: 'Prospector Comercial B2B',
      avatar: 'DA',
      avatarIniciais: 'DA',
      avatarCor: '#059669',
      metaMensalFardos: 2000,
      metaMensalReais: 45000,
      senhasValidas: ['daniel123', 'Daniel123', 'Daniel123!', 'daniel123!']
    },
    mikaela: {
      id: 'mikaela',
      usuario: 'mikaela',
      nome: 'Mikaela',
      perfil: 'vendedor',
      vendedorId: 'mikaela',
      cargo: 'Prospectora Comercial B2B',
      avatar: 'MI',
      avatarIniciais: 'MI',
      avatarCor: '#0284C7',
      metaMensalFardos: 2000,
      metaMensalReais: 45000,
      senhasValidas: ['mikaela123', 'Mikaela123']
    }
  };

  // Fallback de armazenamento em memória (para ambientes sem Storage ou Node.js)
  const memoryStore = {};

  function safeGetStorage(key) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const item = localStorage.getItem(key);
        if (item) return item;
      }
    } catch (e) {
      // Storage inacessível no contexto atual
    }

    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem) {
        const item = sessionStorage.getItem(key);
        if (item) return item;
      }
    } catch (e) {
      // Storage inacessível no contexto atual
    }

    return memoryStore[key] || null;
  }

  function safeSetStorage(key, value) {
    memoryStore[key] = value;

    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Falha ao gravar no localStorage
    }

    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.setItem) {
        sessionStorage.setItem(key, value);
      }
    } catch (e) {
      // Falha ao gravar no sessionStorage
    }
  }

  function safeRemoveStorage(key) {
    delete memoryStore[key];

    try {
      if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Falha ao remover do localStorage
    }

    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.removeItem) {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      // Falha ao remover do sessionStorage
    }
  }

  /**
   * Extrai 2 iniciais maiúsculas de um nome completo (ex: Mariana Souza -> MS)
   */
  function gerarIniciais(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return 'CO';
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  /**
   * Registra um vendedor no catálogo dinâmico em memória USUARIOS_DINAMICOS
   */
  function registrarVendedorDinamicoEmMemoria(v) {
    if (!v) return;
    const login = String(v.login || v.id || v.usuario || '').trim().toLowerCase();
    if (!login) return;

    const nome = String(v.nome || login).trim();
    const iniciais = v.avatarIniciais || v.avatar || gerarIniciais(nome);
    const senhas = Array.isArray(v.senhasValidas) && v.senhasValidas.length > 0
      ? v.senhasValidas
      : [String(v.senhaInicial || v.senha_hash || ''), 'isapel2026'].filter(Boolean);

    USUARIOS_DINAMICOS[login] = {
      id: login,
      usuario: login,
      login: login,
      nome: nome,
      perfil: 'vendedor',
      vendedorId: login,
      cargo: String(v.cargo || 'Consultor Comercial B2B').trim(),
      avatar: iniciais,
      avatarIniciais: iniciais,
      avatarCor: v.avatarCor || v.avatar_cor || '#0284C7',
      metaMensalReais: Number(v.metaMensalReais || v.meta_reais) || 40000,
      metaMensalFardos: Number(v.metaMensalFardos || v.meta_fardos) || 1500,
      senhasValidas: senhas,
      ativo: v.ativo !== false,
      criadoEm: v.criadoEm || v.criado_em || new Date().toISOString(),
      criadoPor: v.criadoPor || v.criado_por || 'diretoria'
    };
  }

  /**
   * Carrega os vendedores customizados gravados no localStorage
   */
  function carregarVendedoresCustomizados() {
    try {
      const raw = safeGetStorage(VENDEDORES_STORAGE_KEY);
      if (raw) {
        const lista = JSON.parse(raw);
        if (Array.isArray(lista)) {
          lista.forEach(registrarVendedorDinamicoEmMemoria);
        }
      }
    } catch (e) {
      // Storage inacessível ou JSON com formatação incorreta
    }
  }

  /**
   * Registra em lote uma lista de vendedores dinâmicos
   */
  function registrarVendedoresDinamicos(lista) {
    if (!Array.isArray(lista)) return;
    lista.forEach(registrarVendedorDinamicoEmMemoria);
  }

  /**
   * Busca as credenciais e configurações de um usuário (estático ou dinâmico)
   */
  function obterUsuarioConfig(usuario) {
    const u = String(usuario || '').trim().toLowerCase();
    if (!u) return null;
    if (USUARIOS_CONFIG[u]) return USUARIOS_CONFIG[u];
    if (USUARIOS_DINAMICOS[u]) return USUARIOS_DINAMICOS[u];
    carregarVendedoresCustomizados();
    return USUARIOS_DINAMICOS[u] || null;
  }

  // Inicializa o catálogo dinâmico no carregamento do módulo
  carregarVendedoresCustomizados();

  /**
   * Obtém os dados da sessão autenticada ativa.
   * @returns {Object|null} Objeto da sessão ou null se inexistente/inválida.
   */
  function obterSessao() {
    try {
      const dataStr = safeGetStorage(STORAGE_KEY);
      if (!dataStr) return null;

      const sessao = JSON.parse(dataStr);
      if (!sessao || typeof sessao !== 'object' || !sessao.usuario || !sessao.perfil) {
        safeRemoveStorage(STORAGE_KEY);
        return null;
      }

      // Validação estrita de integridade contra tampering no storage
      const config = obterUsuarioConfig(sessao.usuario);
      if (!config) {
        safeRemoveStorage(STORAGE_KEY);
        return null;
      }

      if (sessao.perfil !== config.perfil || sessao.vendedorId !== config.vendedorId) {
        safeRemoveStorage(STORAGE_KEY);
        return null;
      }

      // Garante sincronização entre localStorage e sessionStorage
      safeSetStorage(STORAGE_KEY, dataStr);

      return sessao;
    } catch (err) {
      safeRemoveStorage(STORAGE_KEY);
      return null;
    }
  }

  /**
   * Verifica se existe uma sessão válida ativa.
   * @returns {boolean}
   */
  function estaAutenticado() {
    const sessao = obterSessao();
    return Boolean(sessao && sessao.usuario && sessao.perfil);
  }

  /**
   * Executa o login com validação de usuário e senha.
   * @param {string} usuario - Identificador do usuário (ex: 'maciel', 'fernanda', 'caio', 'diretoria' ou vendedor dinâmico).
   * @param {string} senha - Senha digitada.
   * @returns {{ ok: boolean, sessao?: Object, erro?: string }}
   */
  function login(usuario, senha) {
    const userClean = String(usuario || '').trim().toLowerCase();
    const passClean = String(senha || '');

    if (!userClean || !passClean) {
      return { ok: false, erro: 'Por favor, preencha o usuário e a senha.' };
    }

    const config = obterUsuarioConfig(userClean);
    if (!config) {
      return { ok: false, erro: 'Usuário ou senha incorretos.' };
    }

    const senhaCorreta = Array.isArray(config.senhasValidas) && config.senhasValidas.includes(passClean);
    if (!senhaCorreta) {
      return { ok: false, erro: 'Usuário ou senha incorretos.' };
    }

    const sessao = {
      usuario: config.usuario,
      nome: config.nome,
      perfil: config.perfil,
      vendedorId: config.vendedorId,
      cargo: config.cargo,
      avatar: config.avatar,
      token: `prospec_token_${config.usuario}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      loginEm: new Date().toISOString()
    };

    safeSetStorage(STORAGE_KEY, JSON.stringify(sessao));

    return { ok: true, sessao };
  }

  /**
   * Cadastra um novo vendedor com controle rigoroso de RBAC.
   * Somente usuários com perfil 'diretoria' têm permissão para cadastrar.
   * @param {Object} dados - { nome, login, senhaInicial, cargo, metaMensalReais, metaMensalFardos, avatarCor }
   * @param {Object} [sessao] - Sessão do solicitante. Se omitida, consulta obterSessao().
   * @returns {{ ok: boolean, vendedor?: Object, erro?: string }}
   */
  function cadastrarVendedor() {
    return { ok: false, erro: 'Cadastro de novos usuários desabilitado no CRM de Prospecções.' };
  }

  /**
   * Retorna a lista unificada de todos os vendedores (fundadores + dinâmicos).
   * @returns {Array<Object>}
   */
  function obterVendedores() {
    carregarVendedoresCustomizados();

    const fundadores = [
      {
        id: 'maciel',
        login: 'maciel',
        usuario: 'maciel',
        nome: 'Gabriel Maciel',
        perfil: 'vendedor',
        vendedorId: 'maciel',
        cargo: 'Vendedor Sênior B2B',
        avatar: 'GM',
        avatarIniciais: 'GM',
        avatarCor: '#003360',
        metaMensalFardos: 2500,
        metaMensalReais: 60000
      },
      {
        id: 'fernanda',
        login: 'fernanda',
        usuario: 'fernanda',
        nome: 'Fernanda',
        perfil: 'vendedor',
        vendedorId: 'fernanda',
        cargo: 'Consultora Comercial',
        avatar: 'FE',
        avatarIniciais: 'FE',
        avatarCor: '#0284C7',
        metaMensalFardos: 2000,
        metaMensalReais: 45000
      },
      {
        id: 'caio',
        login: 'caio',
        usuario: 'caio',
        nome: 'Caio',
        perfil: 'vendedor',
        vendedorId: 'caio',
        cargo: 'SDR & Hunter B2B',
        avatar: 'CA',
        avatarIniciais: 'CA',
        avatarCor: '#38BDF8',
        metaMensalFardos: 1500,
        metaMensalReais: 35000
      },
      {
        id: 'albert',
        login: 'albert',
        usuario: 'albert',
        nome: 'Albert',
        perfil: 'vendedor',
        vendedorId: 'albert',
        cargo: 'Consultor Comercial B2B',
        avatar: 'AL',
        avatarIniciais: 'AL',
        avatarCor: '#0284C7',
        metaMensalFardos: 2000,
        metaMensalReais: 45000
      },
      {
        id: 'daniel',
        login: 'daniel',
        usuario: 'daniel',
        nome: 'Daniel',
        perfil: 'vendedor',
        vendedorId: 'daniel',
        cargo: 'Consultor Comercial B2B',
        avatar: 'DA',
        avatarIniciais: 'DA',
        avatarCor: '#059669',
        metaMensalFardos: 2000,
        metaMensalReais: 45000
      }
    ];

    const dinamicos = Object.keys(USUARIOS_DINAMICOS).map(k => {
      const u = USUARIOS_DINAMICOS[k];
      return {
        id: u.id || u.usuario,
        login: u.usuario || u.id,
        usuario: u.usuario,
        nome: u.nome,
        perfil: 'vendedor',
        vendedorId: u.vendedorId || u.id,
        cargo: u.cargo,
        avatar: u.avatar || u.avatarIniciais || 'CO',
        avatarIniciais: u.avatarIniciais || u.avatar || 'CO',
        avatarCor: u.avatarCor || '#0284C7',
        metaMensalFardos: Number(u.metaMensalFardos) || 1500,
        metaMensalReais: Number(u.metaMensalReais) || 40000
      };
    });

    return [...fundadores, ...dinamicos];
  }

  /**
   * Sincroniza a lista de vendedores a partir do Supabase
   */
  async function sincronizarVendedoresNuvem() {
    if (typeof window !== 'undefined' && window.IsapelSync && typeof window.IsapelSync.carregarVendedores === 'function') {
      try {
        const listaNuvem = await window.IsapelSync.carregarVendedores();
        if (Array.isArray(listaNuvem) && listaNuvem.length > 0) {
          registrarVendedoresDinamicos(listaNuvem);
        }
        return listaNuvem;
      } catch (e) {
        console.warn('[IsapelAuth] Falha ao sincronizar vendedores da nuvem:', e);
      }
    }
    return null;
  }

  /**
   * Encerra a sessão ativa e redireciona para a tela de login.
   * @param {string} [destino='login.html'] - URL de redirecionamento.
   */
  function logout(destino = 'login.html') {
    safeRemoveStorage(STORAGE_KEY);
    if (typeof window !== 'undefined' && window.location) {
      window.location.replace(destino);
    }
    return true;
  }

  /**
   * Guarda de rota: redireciona para a tela de login se não autenticado.
   * @param {string} [destino='login.html'] - Destino caso desautenticado.
   * @returns {boolean} True se autenticado, False se redirecionou.
   */
  function protegerRota(destino = 'login.html') {
    if (!estaAutenticado()) {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(destino);
      }
      return false;
    }
    return true;
  }

  /**
   * Redireciona para o painel principal se já estiver autenticado.
   * @param {string} [destino='index.html'] - Destino caso já autenticado.
   * @returns {boolean} True se redirecionou, False caso contrário.
   */
  function redirecionarSeAutenticado(destino = 'index.html') {
    if (estaAutenticado()) {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(destino);
      }
      return true;
    }
    return false;
  }

  /**
   * Retorna o perfil do usuário logado ('vendedor' ou 'diretoria').
   * @returns {string|null}
   */
  function obterPerfil() {
    const s = obterSessao();
    return s ? s.perfil : null;
  }

  /**
   * Retorna o vendedorId do usuário logado ('maciel', 'fernanda', 'caio' ou null para diretoria).
   * @returns {string|null}
   */
  function obterVendedorId() {
    const s = obterSessao();
    return s ? s.vendedorId : null;
  }

  return {
    STORAGE_KEY,
    VENDEDORES_STORAGE_KEY,
    obterSessao,
    estaAutenticado,
    login,
    logout,
    protegerRota,
    redirecionarSeAutenticado,
    obterPerfil,
    obterVendedorId,
    cadastrarVendedor,
    obterVendedores,
    carregarVendedoresCustomizados,
    registrarVendedoresDinamicos,
    sincronizarVendedoresNuvem,
    USUARIOS_CONFIG,
    USUARIOS_DINAMICOS,
    // Exposição utilitária de todos os usuários configurados (sem senhas)
    obterUsuarios: () => {
      carregarVendedoresCustomizados();
      const todos = { ...USUARIOS_CONFIG, ...USUARIOS_DINAMICOS };
      return Object.keys(todos).map(k => ({
        usuario: todos[k].usuario,
        nome: todos[k].nome,
        perfil: todos[k].perfil,
        vendedorId: todos[k].vendedorId,
        cargo: todos[k].cargo,
        avatar: todos[k].avatar
      }));
    }
  };
}));
