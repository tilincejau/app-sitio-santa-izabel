'use strict';
/* =========================================================
   SÍTIO SANTA IZABEL — FRONT-END
   Cada tela é uma "definição" (lista de campos). O motor lá embaixo
   monta o formulário, valida, guarda no aparelho e envia quando há sinal.
   ========================================================= */

const API_URL = 'https://script.google.com/macros/s/AKfycbyw4HO_475NOJORwUuEhiIBXO7shuDChGk_uJQwL5vNMvywh2l0CYu2Odu-kIxb79rg/exec';

const RESP = ['OCIMAR DONIZETE ZANIBONI', 'VALDECIR APARECIDO LUCAS LEITE'];
const UNID = ['L', 'KG', 'ML', 'G'];
const MAQ_MANUAL = ['TR05', 'TR10'];
const MAQUINAS = ['TR05', 'TR10', 'TR20 MASSEY GERGUSON 4275 - TRAÇADO 4X4', 'TR21 MASSEY GERGUSON 4275 - SIMPLES', 'TR22 NEW HOLLAND TL 5.80'];
const LISTAS_BASE = { maquinas: MAQUINAS };
const OK_TXT = 'Concluído (Limpo)', PEND_TXT = 'Pendente (Precisa de limpeza)';

const EPI_TXT = 'OBRIGATÓRIO: Calçado de segurança, óculos de segurança, luva anticorte, luva impermeável, máscara pesticida, boné árabe, mangote, protetor solar, perneira, luva química, vestimenta agente químicos, protetor auricular concha e protetor auricular.';
const DESCARTE_TXT = 'Siga o protocolo legal: realize a tríplice lavagem imediatamente após o uso, perfure o fundo da embalagem plástica, armazene temporariamente em local seguro e devolva no posto autorizado indicado na sua nota fiscal dentro do prazo de até 1 ano.';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const pad2 = n => String(n).padStart(2, '0');
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const agora = () => { const d = new Date(); return `${hoje()}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const numero = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
const fmt = (n, d = 2) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
const fmtData = iso => { const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const minutos = hhmm => { const p = String(hhmm || '').split(':'); return p.length < 2 ? null : (+p[0]) * 60 + (+p[1]); };

let toastTimer;
function toast(msg, tipo) {
  const t = $('#toast'); t.textContent = msg; t.className = 'on' + (tipo === 'erro' ? ' erro' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

/* ---------- estado e armazenamento ---------- */
const S = {
  usuario: null, token: null,
  dados: { produtos: [], classes: [], listas: {}, estado: { hidro: {}, hidrorep: {}, abast: {} }, ultimos: {}, estoque: [], entradasSemNota: [] }
};

// fila de envios no IndexedDB (aguenta fotos e assinaturas, ao contrário do localStorage)
const DB = (() => {
  let p;
  const abrir = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('sitio-santa-izabel', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fila', { keyPath: 'id_transacao' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (modo, fn) => {
    const db = await abrir();
    return new Promise((res, rej) => {
      const t = db.transaction('fila', modo); const rq = fn(t.objectStore('fila'));
      t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error);
    });
  };
  return { put: o => tx('readwrite', s => s.put(o)), del: k => tx('readwrite', s => s.delete(k)), todos: () => tx('readonly', s => s.getAll()) };
})();

async function api(body) {
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  return r.json();
}
async function apiGet(params) {
  const r = await fetch(API_URL + '?' + new URLSearchParams(params));
  return r.json();
}

/* ---------- sincronização ---------- */
let sincronizando = false;
async function sincronizar() {
  if (sincronizando || !navigator.onLine || !S.token) return;
  sincronizando = true;
  try {
    const fila = (await DB.todos()).filter(i => i.status !== 'erro').sort((a, b) => a.criado - b.criado);
    for (const item of fila) {
      let r;
      try { r = await api({ ...item.payload, usuario: S.usuario, token: S.token }); } catch (e) { break; }   // sem sinal: tenta depois
      if (r.sucesso) await DB.del(item.id_transacao);
      else if (r.codigo === 'AUTH') { sair(); break; }
      else { item.status = 'erro'; item.erro = r.erro || 'Erro desconhecido'; await DB.put(item); }
    }
    await atualizarDados();
  } finally { sincronizando = false; await renderStatus(); }
}

async function atualizarDados() {
  try {
    const r = await apiGet({ acao: 'dados', usuario: S.usuario, token: S.token });
    if (r.codigo === 'AUTH') return sair();
    if (r.sucesso) { S.dados = r; localStorage.setItem('sitio_dados', JSON.stringify(r)); }
  } catch (e) { /* offline: usa o que já está guardado */ }
}

async function renderStatus() {
  const b = $('#status-sync'); if (!b) return;
  const todos = await DB.todos(), erros = todos.filter(i => i.status === 'erro').length, esperando = todos.length - erros;
  if (erros) { b.className = 'pill erro'; b.textContent = `${erros} envio(s) com erro — toque para ver`; }
  else if (esperando) { b.className = 'pill aviso'; b.textContent = navigator.onLine ? `Enviando ${esperando} lançamento(s)…` : `${esperando} lançamento(s) guardados — aguardando sinal`; }
  else { b.className = 'pill ok'; b.replaceChildren(el('i', { class: 'ph-fill ph-check-circle' }), navigator.onLine ? ' Tudo enviado' : ' Tudo enviado (sem sinal agora)'); }
}

/* ---------- telas ---------- */
function mostrar(id) {
  document.querySelectorAll('.tela').forEach(t => { t.hidden = t.id !== id; });
  window.scrollTo(0, 0);
}
function irMenu() { mostrar('tela-menu'); renderStatus(); }

async function entrar() {
  const u = $('#login-usuario').value.trim(), s = $('#login-senha').value, erro = $('#login-erro'), btn = $('#btn-login');
  erro.hidden = true;
  if (!u || !s) { erro.textContent = 'Preencha usuário e senha.'; erro.hidden = false; return; }
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const r = await api({ acao: 'login', usuario: u, senha: s });
    if (!r.sucesso) throw new Error(r.erro);
    S.usuario = r.usuario; S.token = r.token;
    localStorage.setItem('sitio_sessao', JSON.stringify({ u: S.usuario, t: S.token }));
    $('#login-senha').value = '';
    await iniciarApp();
  } catch (e) { erro.textContent = e.message === 'Failed to fetch' ? 'Sem conexão. Para o primeiro acesso é preciso internet.' : e.message; erro.hidden = false; }
  btn.disabled = false; btn.textContent = 'Entrar';
}

function sair() {
  localStorage.removeItem('sitio_sessao'); S.usuario = S.token = null;
  mostrar('tela-login');
}

async function iniciarApp() {
  $('#usuario-nome').textContent = S.usuario;
  try { const c = JSON.parse(localStorage.getItem('sitio_dados')); if (c) S.dados = c; } catch (e) {}
  montarMenu(); irMenu();
  sincronizar();
}

/* =========================================================
   DEFINIÇÃO DAS TELAS
   t: text | number | date | datetime | time | textarea | select | multi | grupo | produtos | assinatura | foto | info | secao
   Todo campo é obrigatório, exceto com opt:true.  ro:true = só leitura.  def = valor inicial.
   showIf(V, store) mostra/esconde.  outro:true acrescenta "Outro (digitar)".  persist:'lista' guarda o "Outro" para a próxima vez.
   ========================================================= */
const ehAdub = V => V.aplicacao === 'ADUBAÇÃO';
const resp = () => ({ k: 'resp', t: 'select', l: 'Responsável', opts: RESP });
const assin = () => ({ k: 'assinatura', t: 'assinatura', l: 'Assinatura' });
const parseDH = s => { const d = new Date(s); return isNaN(d) ? null : d; };

const MODULOS = [
  { id: 'aplicacao', grupo: 'Aplicações', nome: 'Pulverização / Adubação', icone: 'ph-flask', cor: '#7a4fa3', largo: true,
    campos: [
      { t: 'secao', l: 'Dados gerais' },
      { k: 'aplicacao', t: 'select', l: 'Aplicação', opts: ['PULVERIZAÇÃO', 'ADUBAÇÃO'] },
      { k: 'tipo', t: 'select', l: 'Tipo', opts: ['PREVENTIVA', 'CORRETIVA'] },
      { k: 'talhao', t: 'select', l: 'Talhão', opts: ['1', '2', '3'] },
      { k: 'areas', t: 'multi', l: 'Área', opts: ['A', 'B'], subTitle: v => 'Área ' + v,
        sub: [
          { k: 'inicio', t: 'datetime', l: 'Data e hora de início' },
          { k: 'fim', t: 'datetime', l: 'Data e hora de fim' },
          { k: 'n', t: 'number', l: 'Número de aplicações' }
        ] },
      { k: 'justificativa', t: 'select', l: 'Justificativa', outro: true, opts: ['Controle Preventivo (Calendário)', 'Controle de Pragas (Monitoramento)', 'Manejo de Doenças Fúngicas/Bacterianas', 'Manejo de Plantas Daninhas', 'Adubação de Produção / Manutenção', 'Adubação de Estimulação (Floração)', 'Correção de Deficiência Nutricional', 'Recomendação Baseada em Análise de Solo/Folha', 'Controle do Greening'] },
      { k: 'cultura', t: 'text', l: 'Cultura', def: 'Lima Ácida', ro: true },
      { k: 'variedade', t: 'text', l: 'Variedade', def: 'Tahiti', ro: true },
      { k: 'alvo', t: 'text', l: 'Alvo' },
      { k: 'fase', t: 'select', l: 'Fase fenológica', outro: true, opts: ['1. Indução e Botão Floral', '2. Florescimento (Antese)', '3. Frutificação', '4. Maturação e Colheita'] },
      { k: 'previsao', t: 'select', l: 'Previsão de colheita', opts: ['Safra Principal (Jan - Mar)', 'Entressafra 1 (Abr - Jun)', 'Entressafra 2 (Jul - Set)', 'Tardia (Out - Dez)'] },
      { t: 'secao', l: 'Calda e máquina' },
      { k: 'metodo', t: 'select', l: 'Método de aplicação', opts: ['PULVERIZAÇÃO', 'SOLO', 'FERTIRRIGAÇÃO'] },
      { k: 'volume', t: 'select', l: 'Volume da calda', outro: true, opts: ['2000 Litros', '4000 Litros'] },
      { k: 'ph', t: 'number', l: 'pH' },
      { k: 'vazao', t: 'number', l: 'Vazão (L/ha)' },
      { k: 'trator', t: 'select', l: 'Trator', outro: true, opts: ['TR05', 'TR10', 'TR20 MASSEY GERGUSON 4275 - TRAÇADO 4X4', 'TR21 MASSEY GERGUSON 4275 - SIMPLES', 'TR22 NEW HOLLAND TL 5.80'] },
      { k: 'marcha', t: 'text', l: 'Marcha' },
      { k: 'rpm', t: 'number', l: 'RPM' },
      { k: 'implemento', t: 'text', l: 'Implemento' },
      { k: 'pressao', t: 'text', l: 'Pressão' },
      { k: 'bico', t: 'text', l: 'Bico' },
      { t: 'secao', l: 'Prazos e clima' },
      { k: 'reentrada', t: 'select', l: 'Reentrada', outro: true, opts: ['24 Horas'] },
      { k: 'carencia', t: 'select', l: 'Carência', opts: ['14 Dias', '7 Dias', '6 Dias', '5 Dias', '4 Dias', '3 Dias', '2 Dias', '1 Dia', 'N/A'] },
      { k: 'intervalo', t: 'select', l: 'Intervalo das aplicações', outro: true, opts: ['Diário', '7 dias (Semanal)', '14 dias (Quinzenal)', '21 a 28 dias (Mensal)', 'N/A'] },
      { k: 'condicoes', t: 'select', l: 'Condições meteorológicas', opts: ['Chuvoso', 'Ensolarado', 'Úmido', 'Condições Normais'] },
      { k: 'vento', t: 'select', l: 'Velocidade do vento', opts: ['Forte', 'Fraco'] },
      { t: 'secao', l: 'Produtos' },
      { k: 'produtos', t: 'produtos', l: 'Produtos (até 10)' },
      { t: 'secao', l: 'Segurança e fechamento' },
      { k: 'epi', t: 'textarea', l: 'EPI', def: EPI_TXT },
      { k: 'mistura', t: 'select', l: 'Mistura do tanque', outro: true, opts: ['N/A'] },
      { k: 'descarte', t: 'textarea', l: 'Cuidados com o descarte', def: DESCARTE_TXT },
      { k: 'sobra', t: 'text', l: 'Sobra de calda', def: 'Não', ro: true },
      { k: 'obs', t: 'select', l: 'Observações adicionais', outro: true, opts: ['N/A'] },
      { k: 'aplicador', t: 'select', l: 'Aplicador', opts: RESP },
      assin()
    ],
    validar: V => {
      for (const [a, x] of Object.entries(V.areas || {})) if (x.inicio && x.fim && x.fim < x.inicio) return `Área ${a}: o fim não pode ser antes do início.`;
    } },

  { id: 'hidrometro', grupo: 'Água', nome: 'Hidrômetro', icone: 'ph-gauge', cor: '#1f78a8',
    campos: [
      { k: 'datahora', t: 'datetime', l: 'Data e hora', now: true },
      { k: 'itens', t: 'multi', l: 'Hidrômetro', opts: ['A', 'B'], subTitle: v => 'Hidrômetro ' + v,
        sub: [
          { k: 'leitura', t: 'number', l: 'Leitura (m³)' },
          { t: 'info', show: (V, s, E) => {
            const p = (E.hidro || {})[s.__opt]; if (!p) return 'Primeira leitura deste hidrômetro.';
            const l = numero(s.leitura), base = `Leitura anterior: ${fmt(p.leitura)} m³ em ${fmtData(p.data)}`;
            if (l == null) return base;
            const cons = l - p.leitura, dias = ((parseDH(V.datahora) || new Date()) - new Date(p.data)) / 864e5;
            return `${base}\nConsumo: ${fmt(cons)} m³ · média por dia: ${fmt(cons / Math.max(1, dias))} m³` + (cons < 0 ? '\n⚠ A leitura está menor que a anterior. Confira.' : '');
          } }
        ] },
      resp(), assin()
    ] },

  { id: 'irrigacao', grupo: 'Água', nome: 'Irrigação', icone: 'ph-drop', cor: '#1f78a8',
    campos: [
      { k: 'datahora', t: 'datetime', l: 'Data e hora', now: true },
      { k: 'itens', t: 'multi', l: 'Área (pode escolher várias)', subTitle: v => v,
        opts: ['TALHÃO 1, ÁREA A', 'TALHÃO 1, ÁREA B', 'TALHÃO 2, ÁREA A', 'TALHÃO 2, ÁREA B', 'TALHÃO 3, ÁREA A', 'TALHÃO 3, ÁREA B'],
        sub: [
          { k: 'inicio', t: 'time', l: 'Início (hora)' },
          { k: 'fim', t: 'time', l: 'Final (hora)' },
          { t: 'info', show: (V, s) => {
            const i = minutos(s.inicio), f = minutos(s.fim); if (i == null || f == null) return '';
            let d = f - i; if (d < 0) d += 1440; return `Tempo de irrigação: ${pad2(Math.floor(d / 60))}h${pad2(d % 60)}`;
          } }
        ] },
      resp(), assin()
    ] },

  { id: 'pluviometro', grupo: 'Água', nome: 'Pluviômetro', icone: 'ph-cloud-rain', cor: '#1f78a8',
    campos: [{ k: 'datahora', t: 'datetime', l: 'Data e hora', now: true }, { k: 'leitura', t: 'number', l: 'Leitura (mm)' }, resp(), assin()] },

  { id: 'hidrorepelente', grupo: 'Lavoura', nome: 'Hidrorrepelente (lavagem EPI)', icone: 'ph-shield-check', cor: '#8a6d1a',
    campos: [
      { k: 'data', t: 'date', l: 'Data da lavagem', now: true },
      { k: 'talhao', t: 'select', l: 'Talhão', opts: ['TALHÃO 1', 'TALHÃO 2', 'TALHÃO 3'] },
      resp(),
      { t: 'info', show: (V, s, E) => {
        if (!V.resp) return ''; const h = (E.hidrorep || {})[V.resp];
        const conj = h && h.conjunto === 'Conjunto 1' ? 'Conjunto 2' : 'Conjunto 1';
        const ult = h && h.n ? h.n[conj] : 0, n = ult ? (ult >= 30 ? 1 : ult + 1) : 1;
        return `Será registrado: ${conj} · lavagem nº ${n}`;
      } },
      assin()
    ] },

  { id: 'abastecimento', grupo: 'Máquinas e diesel', nome: 'Abastecimento', icone: 'ph-gas-pump', cor: '#b4531a',
    campos: [
      { k: 'data', t: 'date', l: 'Data', now: true },
      { k: 'maquina', t: 'select', l: 'Máquina', opts: 'maquinas', outro: true, persist: 'maquinas' },
      { k: 'horIni', t: 'number', l: 'Horímetro inicial',
        dyn: (V, E) => {
          const m = V.maquina, ult = (E.abast || {})[m], manual = !m || MAQ_MANUAL.includes(m) || ult == null;
          return { ro: !manual, auto: !manual, value: manual ? '' : ult };
        } },
      { k: 'horFim', t: 'number', l: 'Horímetro final' },
      { k: 'litros', t: 'number', l: 'Litros' },
      { t: 'info', show: V => {
        const i = numero(V.horIni), f = numero(V.horFim), l = numero(V.litros);
        if (i == null || f == null || l == null) return '';
        if (f < i) return '⚠ O horímetro final não pode ser menor que o inicial.';
        return f - i > 0 ? `Média: ${fmt(l / (f - i))} L/h` : 'Média: 0 L/h';
      } },
      resp(), assin()
    ],
    validar: V => { const i = numero(V.horIni), f = numero(V.horFim); if (i != null && f != null && f < i) return 'O horímetro final não pode ser menor que o inicial.'; } },

  { id: 'diesel', grupo: 'Máquinas e diesel', nome: 'Chegada de diesel', icone: 'ph-truck', cor: '#b4531a',
    campos: [{ k: 'data', t: 'date', l: 'Data da compra', now: true }, { k: 'nf', t: 'text', l: 'Nota fiscal' }, { k: 'litros', t: 'number', l: 'Litros adquiridos (entrada)' }, resp(), assin()] },

  { id: 'limpeza_local', grupo: 'Limpeza', nome: 'Limpeza do local', icone: 'ph-broom', cor: '#2f7d6d',
    campos: [
      { k: 'data', t: 'date', l: 'Data', now: true },
      { k: 'areas', t: 'grupo', l: 'Situação de cada área', itens: [
        { k: 'carreadores', l: 'Carreadores, área de carregamento de caminhões e ponto de encontro de colhedores' },
        { k: 'lixeiras', l: 'Lixeiras' }, { k: 'preparo', l: 'Área de preparo de defensivos' }, { k: 'escritorio', l: 'Escritório' },
        { k: 'banheiro', l: 'Banheiro' }, { k: 'maquinas', l: 'Casa de máquinas' }, { k: 'defensivos', l: 'Depósito de defensivos' },
        { k: 'fertilizantes', l: 'Depósitos de fertilizantes' }, { k: 'suprimentos', l: 'Depósito de suprimentos' },
        { k: 'embalagens', l: 'Depósito de embalagens vazias' }, { k: 'organizacao', l: 'Organização geral' }] },
      resp(), assin()
    ] },

  { id: 'limpeza_equip', grupo: 'Limpeza', nome: 'Limpeza dos equipamentos', icone: 'ph-sparkle', cor: '#2f7d6d',
    campos: [
      { k: 'data', t: 'date', l: 'Data', now: true },
      { k: 'item', t: 'select', l: 'Item', opts: ['CAIXA', 'CARRETA', 'SACOLA'] },
      { k: 'qtd', t: 'number', l: 'Quantidade' },
      { k: 'produto', t: 'text', l: 'Produto utilizado', def: 'DIOXIPLUS A 0,1%', ro: true },
      { k: 'procedimento', t: 'select', l: 'Procedimento', opts: ['PULVERIZAÇÃO', 'SUBMERSÃO'] },
      resp(), assin()
    ] },

  { id: 'estoque', grupo: 'Estoque', nome: 'Estoque de produtos', icone: 'ph-package', cor: '#16342a', largo: true, custom: () => abrirEstoque() }
];

// telas de estoque (usam o mesmo motor)
const FORM_CONTAGEM = { id: 'estoque_contagem', nome: 'Contagem', campos: [
  { k: 'data', t: 'date', l: 'Data da contagem', now: true },
  { k: 'produtoId', t: 'select', l: 'Produto', opts: () => S.dados.produtos.map(p => ({ v: p.id, l: p.nome })) },
  { k: 'qtd', t: 'number', l: 'Quantidade que tem agora' },
  { k: 'unidade', t: 'select', l: 'Unidade', opts: UNID }
] };
const FORM_ENTRADA = { id: 'estoque_entrada', nome: 'Entrada', campos: [
  { k: 'data', t: 'date', l: 'Data em que chegou', now: true },
  { k: 'produtoId', t: 'select', l: 'Produto', opts: () => [...S.dados.produtos.map(p => ({ v: p.id, l: p.nome })), { v: 'NOVO', l: '➕ Produto novo (não está na lista)' }] },
  { k: 'nome', t: 'text', l: 'Nome do produto novo', showIf: (V, s) => s.produtoId === 'NOVO' },
  { k: 'principio', t: 'text', l: 'Princípio ativo', opt: true, showIf: (V, s) => s.produtoId === 'NOVO' },
  { k: 'classe', t: 'select', l: 'Classe toxicológica', opt: true, outro: true, opts: () => S.dados.classes, showIf: (V, s) => s.produtoId === 'NOVO' },
  { k: 'qtd', t: 'number', l: 'Quantidade que chegou' },
  { k: 'unidade', t: 'select', l: 'Unidade', opts: UNID },
  { k: 'nf', t: 'text', l: 'Número da nota (se souber)', opt: true },
  { k: 'foto', t: 'foto', l: 'Foto da nota fiscal', opt: true },
  { t: 'info', show: (V) => V.foto ? '' : 'Sem foto agora? Tudo bem: a entrada fica como "sem nota" e você anexa a foto depois, na aba Posição.' },
  resp()
] };

/* =========================================================
   MOTOR DE FORMULÁRIOS
   ========================================================= */
function opcoes(f) {
  let o = typeof f.opts === 'function' ? f.opts() : f.opts;
  if (typeof o === 'string') o = [...new Set([...(LISTAS_BASE[o] || []), ...((S.dados.listas || {})[o] || [])])];
  return (o || []).map(x => typeof x === 'object' ? x : { v: x, l: x });
}

function renderCampo(f, st, ctx) {
  if (f.t === 'secao') return el('h3', { class: 'secao' }, f.l);
  const w = el('div', { class: 'campo' });
  const obrig = !f.opt;
  const rotulo = f.l ? el('label', { class: 'rot' }, f.l, obrig && f.t !== 'info' ? el('span', { class: 'obrig' }, ' *') : null) : null;
  const checa = fn => ctx.checks.push({ w, fn: () => (!w.isConnected || w.closest('[hidden]')) ? null : fn() });
  if (f.showIf) ctx.shows.push(() => { w.hidden = !f.showIf(ctx.V, st); });

  switch (f.t) {
    case 'text': case 'number': case 'date': case 'datetime': case 'time': case 'textarea': {
      const tipo = { text: 'text', number: 'number', date: 'date', datetime: 'datetime-local', time: 'time' }[f.t];
      const inp = f.t === 'textarea' ? el('textarea', { rows: 4 }) : el('input', { type: tipo, inputmode: f.t === 'number' ? 'decimal' : null, step: f.t === 'number' ? 'any' : null });
      const v0 = f.def !== undefined ? f.def : f.now ? (f.t === 'date' ? hoje() : agora()) : '';
      inp.value = v0; st[f.k] = v0; if (f.ro) inp.readOnly = true;
      inp.addEventListener('input', () => { st[f.k] = inp.value; });
      if (f.dyn) ctx.dyns.push(() => {
        const r = f.dyn(ctx.V, S.dados.estado);
        if (r.auto) { if (inp.value !== String(r.value)) { inp.value = r.value; st[f.k] = String(r.value); } inp.dataset.auto = '1'; }
        else if (inp.dataset.auto === '1') { inp.value = ''; st[f.k] = ''; inp.dataset.auto = '0'; }
        inp.readOnly = !!r.ro;
      });
      if (obrig) checa(() => String(st[f.k] ?? '').trim() === '' ? `Preencha: ${f.l}` : null);
      w.append(rotulo, inp);
      break;
    }
    case 'select': {
      const sel = el('select', {}, el('option', { value: '' }, 'Selecione…'), opcoes(f).map(o => el('option', { value: o.v }, o.l)), f.outro ? el('option', { value: '__outro' }, 'Outro (digitar)…') : null);
      const txt = el('input', { type: 'text', placeholder: 'Digite aqui…', hidden: true });
      const sync = () => {
        if (sel.value === '__outro') { txt.hidden = false; st[f.k] = txt.value.trim(); st[f.k + '__novo'] = true; }
        else { txt.hidden = true; st[f.k] = sel.value; delete st[f.k + '__novo']; }
      };
      if (f.def !== undefined) sel.value = f.def;
      st[f.k] = sel.value;
      sel.addEventListener('change', sync); txt.addEventListener('input', sync);
      if (f.persist) ctx.persist.push(() => st[f.k + '__novo'] && st[f.k] ? { lista: f.persist, valor: st[f.k] } : null);
      if (obrig) checa(() => !st[f.k] ? `Preencha: ${f.l}` : null);
      w.append(rotulo, sel, txt);
      break;
    }
    case 'multi': {
      const sel = {}; st[f.k] = sel;
      const chips = el('div', { class: 'chips' }), blocos = el('div');
      opcoes(f).forEach(o => {
        const sub = { __opt: o.v };
        const bloco = el('div', { class: 'bloco', hidden: true }, el('h4', {}, f.subTitle ? f.subTitle(o.v) : o.l));
        (f.sub || []).forEach(sf => bloco.append(renderCampo(sf, sub, ctx)));
        const chip = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: () => {
          const on = !chip.classList.contains('on');
          chip.classList.toggle('on', on); chip.setAttribute('aria-pressed', on); bloco.hidden = !on;
          if (on) sel[o.v] = sub; else delete sel[o.v];
          ctx.refresh();
        } }, o.l);
        chips.append(chip); blocos.append(bloco);
      });
      checa(() => Object.keys(sel).length ? null : `Escolha ao menos uma opção em: ${f.l}`);
      w.append(rotulo, chips, blocos);
      break;
    }
    case 'grupo': {
      const g = {}; st[f.k] = g; w.append(rotulo);
      f.itens.forEach(it => {
        const s = g[it.k] = { status: '', obs: '' };
        const bOk = el('button', { type: 'button' }, 'Concluído'), bPe = el('button', { type: 'button' }, 'Pendente');
        const marca = v => { s.status = v; bOk.className = v === OK_TXT ? 'sel-ok' : ''; bPe.className = v === PEND_TXT ? 'sel-pend' : ''; };
        bOk.onclick = () => marca(OK_TXT); bPe.onclick = () => marca(PEND_TXT);
        const obs = el('input', { type: 'text', placeholder: 'Observação (se houver)', oninput: e => { s.obs = e.target.value; } });
        w.append(el('div', { class: 'gr-item' }, el('span', {}, it.l), el('div', { class: 'duplo' }, bOk, bPe), obs));
      });
      checa(() => { const falta = f.itens.find(it => !g[it.k].status); return falta ? `Informe a situação: ${falta.l}` : null; });
      break;
    }
    case 'produtos': renderProdutos(f, st, ctx, w, rotulo, checa); break;
    case 'assinatura': {
      const cv = el('canvas', { class: 'pad', width: 700, height: 240 }), g = cv.getContext('2d');
      let tinta = false, desenhando = false;
      const limpa = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.lineWidth = 4; g.lineCap = 'round'; g.strokeStyle = '#000'; tinta = false; };
      limpa();
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      cv.addEventListener('pointerdown', e => { desenhando = true; cv.setPointerCapture(e.pointerId); const p = pos(e); g.beginPath(); g.moveTo(p.x, p.y); e.preventDefault(); });
      cv.addEventListener('pointermove', e => { if (!desenhando) return; const p = pos(e); g.lineTo(p.x, p.y); g.stroke(); tinta = true; });
      ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { desenhando = false; }));
      ctx.finalizers.push(() => { st[f.k] = tinta ? cv.toDataURL('image/png') : ''; });
      checa(() => tinta ? null : `Falta a assinatura`);
      w.append(rotulo, cv, el('button', { type: 'button', class: 'link', onclick: limpa }, 'Limpar assinatura'));
      break;
    }
    case 'foto': {
      const prev = el('img', { class: 'prev', hidden: true, alt: 'Prévia da foto' });
      const botao = cam => el('label', { class: 'btn-foto' + (cam ? '' : ' sec') }, el('i', { class: 'ph ' + (cam ? 'ph-camera' : 'ph-image') }), cam ? 'Tirar foto' :'Galeria',
        el('input', { type: 'file', accept: 'image/*', capture: cam ? 'environment' : null, hidden: true, onchange: async e => {
          const arq = e.target.files[0]; if (!arq) return;
          st[f.k] = await comprimir(arq); prev.src = st[f.k]; prev.hidden = false; ctx.refresh();
        } }));
      if (obrig) checa(() => st[f.k] ? null : `Tire a foto: ${f.l}`);
      st[f.k] = '';
      w.append(rotulo, el('div', { class: 'fotos' }, botao(true), botao(false)), prev);
      break;
    }
    case 'info': {
      const box = el('div', { class: 'dica', hidden: true }); w.append(box);
      ctx.infos.push(() => { if (!w.isConnected) return; const t = f.show(ctx.V, st, S.dados.estado) || ''; box.textContent = t; box.hidden = !t; box.classList.toggle('aviso', t.includes('⚠')); });
      break;
    }
  }
  return w;
}

function renderProdutos(f, st, ctx, w, rotulo, checa) {
  const lista = []; st[f.k] = lista;
  const cont = el('div', { class: 'prods' });
  const btnAdd = el('button', { type: 'button', class: 'btn sec', onclick: () => novo() }, '+ Adicionar produto');
  const adub = V => ehAdub(V), pulv = V => !ehAdub(V), novoP = (V, s) => s.id === 'NOVO';
  const campos = () => [
    { k: 'id', t: 'select', l: 'Produto', opts: () => [...S.dados.produtos.map(p => ({ v: p.id, l: p.nome })), { v: 'NOVO', l: '➕ Outro (produto novo)' }] },
    { k: 'nome', t: 'text', l: 'Nome do produto novo', showIf: novoP },
    { k: 'principio', t: 'text', l: 'Princípio ativo', showIf: novoP },
    { k: 'classe', t: 'select', l: 'Classe toxicológica', outro: true, opts: () => S.dados.classes, showIf: novoP },
    { t: 'info', show: (V, s) => { const p = S.dados.produtos.find(x => x.id === s.id); return p ? `Princípio ativo: ${p.principio || '-'}\nClasse: ${p.classe || '-'}` : ''; } },
    { k: 'dosagem', t: 'number', l: 'Dosagem', showIf: pulv },
    { k: 'pes', t: 'select', l: 'Quantidade de pés', opts: ['7500', '4200', '2200'], showIf: adub },
    { k: 'dosePlanta', t: 'number', l: 'Dose por planta', showIf: adub },
    { k: 'unidade', t: 'select', l: 'Unidade', opts: UNID },
    { t: 'info', show: (V, s) => adub(V) && numero(s.pes) && numero(s.dosePlanta) ? `Dose por talhão: ${fmt(numero(s.pes) * numero(s.dosePlanta), 3)} ${s.unidade || ''}` : '' }
  ];
  const numerar = () => { cont.querySelectorAll('.prod-topo strong').forEach((s, i) => { s.textContent = `Produto ${i + 1}`; }); btnAdd.hidden = lista.length >= 10; };
  function novo() {
    if (lista.length >= 10) return;
    const item = {}; lista.push(item);
    const card = el('div', { class: 'prod' });
    const remover = el('button', { type: 'button', class: 'btn perigo mini', onclick: () => { lista.splice(lista.indexOf(item), 1); card.remove(); numerar(); ctx.refresh(); } }, 'Remover');
    card.append(el('div', { class: 'prod-topo' }, el('strong'), remover));
    campos().forEach(c => card.append(renderCampo(c, item, ctx)));
    cont.append(card); numerar(); ctx.refresh();
  }
  checa(() => lista.length ? null : 'Adicione ao menos um produto');
  w.append(rotulo, cont, btnAdd);
  novo();
}

function comprimir(file, max = 1400, q = .7) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = rej; img.src = url;
  });
}

// Monta o formulário de um módulo dentro de "container". onSalvo() é chamado depois de guardar.
function montarForm(m, container, onSalvo) {
  const ctx = { V: {}, checks: [], shows: [], dyns: [], infos: [], finalizers: [], persist: [] };
  ctx.refresh = () => { ctx.dyns.forEach(f => f()); ctx.shows.forEach(f => f()); ctx.infos.forEach(f => f()); };
  container.replaceChildren();
  m.campos.forEach(f => container.append(renderCampo(f, ctx.V, ctx)));
  container.addEventListener('input', ctx.refresh); container.addEventListener('change', ctx.refresh);

  const btn = el('button', { type: 'button', class: 'btn' }, 'Salvar lançamento');
  btn.onclick = async () => {
    container.querySelectorAll('.campo.erro').forEach(c => c.classList.remove('erro'));
    ctx.finalizers.forEach(f => f());
    ctx.refresh();
    let msg = null;
    for (const c of ctx.checks) { const e = c.fn(); if (e) { msg = e; c.w.classList.add('erro'); c.w.scrollIntoView({ block: 'center', behavior: 'smooth' }); break; } }
    if (!msg && m.validar) msg = m.validar(ctx.V) || null;
    if (msg) return toast(msg, 'erro');
    btn.disabled = true;
    const id = uid();
    const payload = { acao: 'salvar', modulo: m.id, id_transacao: id, dados: JSON.parse(JSON.stringify(ctx.V)), novasListas: ctx.persist.map(f => f()).filter(Boolean) };
    await DB.put({ id_transacao: id, payload, criado: Date.now(), titulo: m.nome });
    (payload.novasListas).forEach(n => { const l = S.dados.listas[n.lista] = S.dados.listas[n.lista] || []; if (!l.includes(n.valor)) l.push(n.valor); });
    toast('Salvo no aparelho ✔');
    onSalvo(); sincronizar();
  };
  container.append(btn);
  ctx.refresh();
  return ctx;
}

/* ---------- navegação dos módulos ---------- */
function montarMenu() {
  const g = $('#grid-modulos'); g.replaceChildren();
  const grupos = [...new Set(MODULOS.map(m => m.grupo))];
  grupos.forEach(nome => {
    g.append(el('h2', {}, nome));
    const linha = el('div', { class: 'linha' });
    MODULOS.filter(m => m.grupo === nome).forEach(m => linha.append(
      el('button', { class: 'mod' + (m.largo ? ' largo' : ''), style: `--cor:${m.cor}`, onclick: () => abrirModulo(m) }, el('i', { class: 'ph ' + m.icone }), m.nome)));
    g.append(linha);
  });
}

function abrirModulo(m) {
  if (m.custom) return m.custom();
  $('#form-titulo').textContent = m.nome;
  const ult = $('#form-ultimos'), lista = (S.dados.ultimos || {})[m.id] || [];
  ult.replaceChildren();
  if (lista.length) { ult.hidden = false; ult.append(el('details', {}, el('summary', {}, 'Últimos lançamentos'), lista.map(r => el('div', {}, r.filter(Boolean).join(' · '))))); } else ult.hidden = true;
  mostrar('tela-form');
  montarForm(m, $('#form-root'), irMenu);
}

/* ---------- estoque ---------- */
let abaEstoque = 'posicao';
function abrirEstoque(aba) {
  if (aba) abaEstoque = aba;
  mostrar('tela-estoque');
  const abas = $('#estoque-abas'); abas.replaceChildren();
  [['posicao', 'Posição'], ['entrada', 'Chegou produto'], ['contagem', 'Contagem']].forEach(([id, nome]) =>
    abas.append(el('button', { class: id === abaEstoque ? 'on' : '', onclick: () => abrirEstoque(id) }, nome)));
  const root = $('#estoque-root');
  if (abaEstoque === 'entrada') montarForm(FORM_ENTRADA, root, () => abrirEstoque('posicao'));
  else if (abaEstoque === 'contagem') montarForm(FORM_CONTAGEM, root, () => abrirEstoque('posicao'));
  else renderPosicao(root);
}

function renderPosicao(root) {
  root.replaceChildren();
  const sem = S.dados.entradasSemNota || [];
  if (sem.length) {
    root.append(el('h3', { class: 'secao' }, 'Entradas sem foto da nota'));
    sem.forEach(e => root.append(el('div', { class: 'cartao' },
      el('strong', {}, e.produto), el('span', { class: 'sub', style: 'display:block' }, `${fmt(Number(e.qtd))} ${e.un} · ${fmtData(e.data)}`),
      el('label', { class: 'btn-foto sec', style: 'margin-top:10px' }, el('i', { class: 'ph ph-camera' }), 'Anexar foto da nota',
        el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: async ev => {
          const arq = ev.target.files[0]; if (!arq) return;
          const id = uid(), foto = await comprimir(arq);
          await DB.put({ id_transacao: id, payload: { acao: 'estoque_anexar_nota', id_transacao: id, id_entrada: e.id, foto }, criado: Date.now(), titulo: 'Nota de ' + e.produto });
          S.dados.entradasSemNota = sem.filter(x => x.id !== e.id); toast('Foto guardada ✔'); renderPosicao(root); sincronizar();
        } })))));
  }
  root.append(el('h3', { class: 'secao' }, 'Quanto tem de cada produto'));
  const busca = el('input', { type: 'search', placeholder: 'Buscar produto…' });
  const lista = el('div');
  root.append(busca, lista);
  const desenhar = () => {
    const q = busca.value.trim().toLowerCase();
    const itens = (S.dados.estoque || []).filter(p => p.nome.toLowerCase().includes(q));
    lista.replaceChildren(...(itens.length ? itens.map(p => el('div', { class: 'item' },
      el('div', {}, p.nome, el('span', { class: 'sub' }, p.contagem ? `Última contagem: ${p.contagem}` : 'Nunca foi contado')),
      el('span', { class: 'val' + (p.negativo ? ' neg' : '') }, `${fmt(p.saldo)} ${p.un}`))) : [el('p', { class: 'sub' }, 'Nenhum produto encontrado.')]));
  };
  busca.addEventListener('input', desenhar); desenhar();
  root.append(el('p', { class: 'sub' }, 'Saldo = última contagem + entradas − o que foi usado nas aplicações desde então. Valor em vermelho: usado mais do que entrou; falta registrar uma entrada ou contagem.'));
}

/* ---------- envios pendentes ---------- */
async function abrirPendencias() {
  mostrar('tela-pendencias');
  const root = $('#pendencias-root'); root.replaceChildren();
  const todos = (await DB.todos()).sort((a, b) => a.criado - b.criado);
  if (!todos.length) { root.append(el('p', {}, 'Nenhum envio pendente. Tudo está na planilha.')); return; }
  todos.forEach(i => {
    const c = el('div', { class: 'cartao' + (i.status === 'erro' ? ' erro' : '') }, el('strong', {}, i.titulo || 'Lançamento'),
      el('span', { class: 'sub', style: 'display:block' }, new Date(i.criado).toLocaleString('pt-BR')),
      i.status === 'erro' ? el('p', { class: 'erro-msg' }, i.erro) : el('p', { class: 'sub' }, 'Aguardando envio…'));
    if (i.status === 'erro') {
      c.append(el('button', { class: 'btn sec mini', onclick: async () => { delete i.status; delete i.erro; await DB.put(i); sincronizar(); abrirPendencias(); } }, 'Tentar de novo'),
        ' ', el('button', { class: 'btn perigo mini', onclick: async () => { if (confirm('Descartar este lançamento? Ele não será enviado.')) { await DB.del(i.id_transacao); abrirPendencias(); renderStatus(); } } }, 'Descartar'));
    }
    root.append(c);
  });
}

/* ---------- início ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#btn-login').onclick = entrar;
  $('#login-senha').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
  $('#btn-sair').onclick = () => { if (confirm('Sair da conta?')) sair(); };
  $('#status-sync').onclick = async () => { const todos = await DB.todos(); if (todos.length) abrirPendencias(); else { toast('Atualizando…'); await sincronizar(); toast('Dados atualizados ✔'); } };
  document.querySelectorAll('[data-voltar]').forEach(b => b.onclick = irMenu);
  window.addEventListener('online', sincronizar); window.addEventListener('offline', renderStatus);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
  setInterval(sincronizar, 30000);
  try { const s = JSON.parse(localStorage.getItem('sitio_sessao')); if (s) { S.usuario = s.u; S.token = s.t; iniciarApp(); return; } } catch (e) {}
  mostrar('tela-login');
});
