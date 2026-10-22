'use strict';
/* =========================================================
   SÍTIO SANTA IZABEL — FRONT-END
   Cada tela é uma "definição" (lista de campos). O motor lá embaixo
   monta o formulário, valida, guarda no aparelho e envia quando há sinal.
   ========================================================= */

const APP_VERSAO = 'v26';   // aparece no rodapé do menu; confira se o celular já está com a versão nova
const API_URL = 'https://script.google.com/macros/s/AKfycbyw4HO_475NOJORwUuEhiIBXO7shuDChGk_uJQwL5vNMvywh2l0CYu2Odu-kIxb79rg/exec';

const RESP = ['OCIMAR DONIZETE ZANIBONI', 'VALDECIR APARECIDO LUCAS LEITE'];
const UNID = ['L', 'KG', 'ML', 'G', 'UN'];
const MAQ_MANUAL = ['TR05', 'TR10'];
const MAQUINAS = ['TR05', 'TR10', 'TR20 MASSEY GERGUSON 4275 - TRAÇADO 4X4', 'TR21 MASSEY GERGUSON 4275 - SIMPLES', 'TR22 NEW HOLLAND TL 5.80'];
const LISTAS_BASE = { maquinas: MAQUINAS, monitores: ['LUCAS MILHOSSI'], destinos: ['FRUTATA', 'PRITAM'], expedidores: [...RESP, 'LUCAS MILHOSSI'] };
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
const hhmm = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
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

/* ---------- ícones (embutidos, funcionam sem internet) ---------- */
const ICONES = {
  'flask': '<path d="M9 3h6M10 3v6l-5.5 9.8A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.2L14 9V3M7.8 14.5h8.4"/>',
  'gauge': '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4-6"/><circle cx="12" cy="17" r="1.2"/>',
  'drop': '<path d="M12 3c3.6 4.3 6 7.3 6 10.5a6 6 0 0 1-12 0C6 10.3 8.4 7.3 12 3z"/>',
  'cloud-rain': '<path d="M7 15a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 7.6 3.9 3.9 0 0 1 17 15"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
  'shield-check': '<path d="M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  'gas-pump': '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M7 8h6v3.5H7z"/><path d="M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>',
  'truck': '<path d="M2 6.5h11v10H2zM13 9.5h4.2L20.5 13v3.5H13"/><circle cx="6.5" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/>',
  'broom': '<path d="M14.5 3.5l6 6M13 5l6 6-3 2.5-5.5-5.5zM10.5 11l3 3c-1 4.2-4.2 6.5-8.5 6.5 0-4.3 2.3-7.5 5.5-9.5z"/>',
  'sparkle': '<path d="M11 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z"/><path d="M19 16v4M17 18h4"/>',
  'package': '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  'camera': '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  'image': '<path d="M4 5h16v14H4z"/><path d="M4 16l5-5 4 4 3-3 4 4"/><circle cx="9" cy="9.5" r="1"/>',
  'bug': '<path d="M12 8c-2.2 0-4 1.8-4 4v2a4 4 0 0 0 8 0v-2c0-2.2-1.8-4-4-4z"/><path d="M9.5 5.5L11 8M14.5 5.5L13 8M4 12h4M16 12h4M5 18l3-2M19 18l-3-2M5 7l3 2M19 7l-3 2"/>',
  'target': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  'send': '<path d="M7 17L17 7M8 7h9v9"/>',
  'clipboard': '<path d="M9 4h6v3H9zM7 5.5H5.5v15h13v-15H17"/><path d="M9 12h6M9 16h4"/>',
  'list-check': '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  'tractor': '<circle cx="7" cy="16.5" r="3.6"/><circle cx="18.6" cy="17.6" r="2.2"/><path d="M3.5 13V8h5.4l1.8 4.3H16V6h2.2v9.4"/><path d="M10.6 16.5h5.8"/>',
  'tensiometro': '<circle cx="12" cy="7.5" r="4.5"/><path d="M12 7.5l2.2-1.8"/><path d="M12 12v8.5M10 20.5h4"/><path d="M9.2 16h2.8"/>',
  'map': '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>',
  'caret': '<path d="M9 6l6 6-6 6"/>'
};
function ico(nome) {
  const s = document.createElement('span'); s.className = 'ico';
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
  return s;
}

/* ---------- estado e armazenamento ---------- */
const S = {
  codigo: localStorage.getItem('sitio_codigo') || '', nome: localStorage.getItem('sitio_nome') || '', perfil: localStorage.getItem('sitio_perfil') || 'todos',
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

// Todo pedido tem prazo. Sem isso, um sinal que "pendura" deixaria o envio travado para sempre.
async function fetchJSON(url, opts) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 90000);
  try { const r = await fetch(url, { ...opts, signal: ctl.signal }); return await r.json(); }
  finally { clearTimeout(t); }
}
const api = body => fetchJSON(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...body, codigo: S.codigo }) });
const apiGet = params => fetchJSON(API_URL + '?' + new URLSearchParams({ ...params, codigo: S.codigo }));

/* ---------- guardar no aparelho ---------- */
async function guardar(item) {
  try { await DB.put(item); return true; }
  catch (e) { toast('Não consegui guardar no aparelho. Não saia da tela e tente de novo.', 'erro'); return false; }
}
const lerEnviados = () => { try { return JSON.parse(localStorage.getItem('sitio_enviados')) || []; } catch (e) { return []; } };
function lembrarEnviado(item) {
  const l = lerEnviados(); l.unshift({ titulo: item.titulo, criado: item.criado, enviado: Date.now(), fp: item.fp });
  try { localStorage.setItem('sitio_enviados', JSON.stringify(l.slice(0, 60))); } catch (e) {}
}
// "impressão digital" do lançamento (sem hora, assinatura e foto) para avisar quando alguém salva o mesmo duas vezes
function impressao(modulo, dados) {
  const txt = modulo + JSON.stringify(dados, (k, v) => (k === 'assinatura' || k === 'foto' || k === 'datahora' || k.startsWith('__')) ? undefined : v);
  let h = 5381; for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
  return modulo + ':' + h;
}
async function jaTemIgual(fp) {
  if ((await DB.todos()).some(i => i.fp === fp && i.status !== 'erro')) return true;
  return lerEnviados().some(e => e.fp === fp && Date.now() - e.enviado < 15 * 60 * 1000);
}

/* ---------- sincronização ----------
   Regras que garantem que nada se perde nem duplica:
   1. O lançamento só sai do aparelho depois que o servidor responde "sucesso".
   2. Cada lançamento tem um ID único. Se a resposta se perder no caminho, o reenvio usa o mesmo ID
      e o servidor responde "duplicado" em vez de gravar de novo.
   3. Erro do servidor (ex.: horímetro menor) não apaga nada: o lançamento fica em "Envios" para corrigir ou descartar.
   4. Falha de rede ou instabilidade do Google: tenta de novo sozinho, sem marcar erro. */
let sincronizando = false, ultimaAtualizacao = 0;
async function sincronizar(forcarDados) {
  if (sincronizando || !navigator.onLine) return;
  sincronizando = true;
  let enviou = false;
  try {
    const fila = (await DB.todos()).filter(i => i.status !== 'erro').sort((a, b) => a.criado - b.criado);
    for (const item of fila) {
      let r;
      try { r = await api({ ...item.payload }); } catch (e) { break; }   // sem sinal ou resposta ruim: tenta depois
      if (r.sucesso) { lembrarEnviado(item); await DB.del(item.id_transacao); enviou = true; }
      else if (r.codigo === 'AUTH') { pedirAcesso('Seu acesso foi encerrado ou o código mudou. Digite o código novo. O que você já lançou continua guardado no celular.'); break; }
      else if (r.codigo === 'TEMP') break;
      else { item.status = 'erro'; item.erro = r.erro || 'Erro desconhecido'; await DB.put(item); }
    }
    // A lista de produtos/estoque pesa no Google (abre várias planilhas): só atualiza depois de enviar algo, ao abrir o app ou a cada 10 min.
    if (enviou || forcarDados === true || Date.now() - ultimaAtualizacao > 10 * 60 * 1000) await atualizarDados();
  } finally { sincronizando = false; await renderStatus(); }
}

async function atualizarDados() {
  try {
    if ((await DB.todos()).some(i => i.status !== 'erro')) return;   // com envios pendentes, não troca a lista local
    const r = await apiGet({ acao: 'dados' });
    if (r.codigo === 'AUTH') { pedirAcesso('Seu acesso foi encerrado ou o código mudou. Digite o código novo.'); return; }
    if (r.sucesso) { S.dados = r; S.dadosFrescos = true; if (r.perfil) { S.perfil = r.perfil; localStorage.setItem('sitio_perfil', S.perfil); } await descontarFilaReceitas(S.dados.receitas); S.dados.lavagens = await ajustarLavagensComFila(S.dados.lavagens || []); S.dados.diesel = await dieselComFila(S.dados.diesel); S.dados.chegadas = await ajustarChegadasComFila(S.dados.chegadas || []); ultimaAtualizacao = Date.now(); localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); montarMenu(); verificarAvisoReceitas(); verificarAvisoHidrometro(); }
  } catch (e) { /* sem sinal: segue com o que já está guardado */ }
}

async function renderStatus() {
  const b = $('#status-sync'); if (!b) return;
  const todos = await DB.todos(), erros = todos.filter(i => i.status === 'erro').length, esperando = todos.length - erros;
  let cls = 'ok', txt = 'Tudo enviado', sub = 'Os lançamentos já estão na planilha';
  if (erros) { cls = 'erro'; txt = `${erros} lançamento(s) com erro`; sub = 'Toque para ver e corrigir'; }
  else if (esperando) {
    cls = 'aviso';
    txt = navigator.onLine ? `Enviando ${esperando} lançamento(s)…` : `${esperando} guardado(s) no celular`;
    sub = navigator.onLine ? 'Aguardando a confirmação da planilha' : 'Ainda NÃO enviado. Envia sozinho quando tiver internet';
  }
  b.className = 'painel ' + cls;
  b.replaceChildren(el('span', { class: 'dot' }), el('span', { class: 'txt' }, el('b', {}, txt), el('small', {}, sub)), ico('caret'));
}

/* ---------- acesso ---------- */
function pedirAcesso(msg) {
  S.codigo = ''; S.nome = '';
  localStorage.removeItem('sitio_codigo'); localStorage.removeItem('sitio_nome'); localStorage.removeItem('sitio_perfil'); S.perfil = 'todos';
  mostrar('tela-acesso');
  const m = $('#acesso-msg'); m.textContent = msg || ''; m.hidden = !msg;
  setTimeout(() => { const i = $('#campo-codigo'); if (i) i.focus(); }, 100);
}
async function entrarComCodigo() {
  const campo = $('#campo-codigo'), m = $('#acesso-msg'), btn = $('#btn-acesso');
  const cod = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  m.hidden = true;
  if (cod.length < 6) { m.textContent = 'Digite o código completo.'; m.hidden = false; return; }
  btn.disabled = true; btn.textContent = 'Conferindo…';
  try {
    S.codigo = cod;
    const r = await apiGet({ acao: 'ping' });
    if (!r.sucesso) throw new Error(r.codigo === 'AUTH' ? 'Código inválido ou desativado.' : (r.erro || 'Erro ao conferir o código.'));
    S.nome = r.nome || ''; S.perfil = r.perfil || 'todos';
    localStorage.setItem('sitio_codigo', cod); localStorage.setItem('sitio_nome', S.nome); localStorage.setItem('sitio_perfil', S.perfil);
    campo.value = '';
    iniciarApp();
  } catch (e) {
    S.codigo = '';
    m.textContent = /fetch|Failed|abort/i.test(e.message) ? 'Sem internet. Para o primeiro acesso é preciso estar conectado.' : e.message;
    m.hidden = false;
  }
  btn.disabled = false; btn.textContent = 'Entrar';
}
// Baixa de novo as listas da planilha (produtos, motoristas, etc.). Só roda sem envios esperando, para não apagar o que ainda não foi enviado.
async function atualizarListas() {
  if (!navigator.onLine) return toast('Sem internet agora.', 'erro');
  if ((await DB.todos()).some(i => i.status !== 'erro')) return toast('Há lançamentos esperando envio. Deixe enviar e depois atualize.', 'erro');
  await atualizarDados(); toast('Listas atualizadas ✔');
}
function sairDoAparelho() {
  if (!confirm('Sair deste aparelho? Você vai precisar digitar o código de novo. O que ainda não foi enviado continua guardado.')) return;
  pedirAcesso();
}

/* ---------- telas ---------- */
function mostrar(id) {
  S.tela = id; S.emFormulario = false;   // montarForm marca de novo quando abre um formulário
  document.querySelectorAll('.tela').forEach(t => { t.hidden = t.id !== id; });
  window.scrollTo(0, 0);
  if (typeof renderAlertaReceitas === 'function') renderAlertaReceitas();
}
function irMenu() { mostrar('tela-menu'); montarMenu(); renderStatus(); }   // refaz o menu: os avisos (receitas, lavagem) mudam enquanto o app está aberto

function iniciarApp() {
  if (!S.codigo) { pedirAcesso(); return; }
  try { const c = JSON.parse(localStorage.getItem('sitio_dados')); if (c) S.dados = c; } catch (e) {}
  montarMenu(); irMenu();
  sincronizar(true);
  atualizarReceitas();
  setTimeout(() => { verificarAvisoReceitas(); verificarAvisoHidrometro(); }, 400);   // avisos que já estavam guardados no aparelho
}

/* =========================================================
   DEFINIÇÃO DAS TELAS
   t: text | number | date | datetime | time | textarea | select | multi | grupo | produtos | assinatura | foto | info | secao
   Todo campo é obrigatório, exceto com opt:true.  ro:true = só leitura.  def = valor inicial.
   showIf(V, store) mostra/esconde.  outro:true acrescenta "Outro (digitar)".  persist:'lista' guarda o "Outro" para a próxima vez.
   ========================================================= */
const TALHOES = ['TALHÃO 1', 'TALHÃO 2', 'TALHÃO 3', 'TALHÃO 4'];
const talhaoDe = up => String(up || '').split(',')[0].trim().toUpperCase();   // "TALHÃO 1, ÁREA A" -> "TALHÃO 1"
// Área e armadilhas de cada talhão (o servidor manda os mesmos valores; estes são o reserva sem sinal)
const TALHOES_INFO_PADRAO = { 'TALHÃO 1': { ha: 14.55, armadilhas: 2 }, 'TALHÃO 2': { ha: 8.13, armadilhas: 1 }, 'TALHÃO 3': { ha: 6.16, armadilhas: 1 }, 'TALHÃO 4': { ha: 12.52, armadilhas: 2 } };
const infoTalhao = up => ((S.dados && S.dados.talhoesInfo) || TALHOES_INFO_PADRAO)[talhaoDe(up)] || {};
const coordFixa = up => ((S.dados && S.dados.coordsBF) || {})[talhaoDe(up)];   // a 1ª coordenada capturada do talhão
const UPS_EXPEDICAO = ['TALHÃO 1, ÁREA A', 'TALHÃO 1, ÁREA B', 'TALHÃO 2', 'TALHÃO 3', 'TALHÃO 4'];   // só o talhão 1 tem área A e B
const HORARIOS_IRRIG = { 'TALHÃO 1': ['22:00', '06:00'], 'TALHÃO 2': ['22:00', '02:00'], 'TALHÃO 3': ['02:00', '04:00'] };   // o usuário pode editar; talhão 4 ainda sem horário
const UPS = ['TALHÃO 1, ÁREA A', 'TALHÃO 1, ÁREA B', 'TALHÃO 2, ÁREA A', 'TALHÃO 2, ÁREA B', 'TALHÃO 3, ÁREA A', 'TALHÃO 3, ÁREA B', 'TALHÃO 4, ÁREA A', 'TALHÃO 4, ÁREA B'];
const DESTINOS = {   // destinos padrão: preenchem cidade e CPF/CNPJ (que podem ser editados)
  FRUTATA: { cidade: 'Area Rural, SN - KM 19, Area Rural de Itapolis CEP 14907-899, Itapolis/SP', doc: '63.293.267/0001-34' },
  PRITAM: { cidade: 'AVENIDA PREFEITO TARQUINIO BELLENTANI, 2955, PQ INDUSTRIAL VICENTE NIGRO CEP 14900-000, Itapolis/SP', doc: '04.827.322/0002-40' }
};
const padraoDestino = (V, campo) => (DESTINOS[String(V.destino || '').trim().toUpperCase()] || {})[campo];
const somaCaixas = itens => Object.values(itens || {}).reduce((t, o) => t + (parseInt(o.qtd, 10) || 0), 0);

// ---- receita do técnico e aplicação ----
// pés de cada talhão (o servidor manda os valores do Code.gs; estes são o reserva para quando estiver sem sinal)
const PES_PADRAO = { 'TALHÃO 1': 7487, 'TALHÃO 2': 4167, 'TALHÃO 3': 2200, 'TALHÃO 4': 4460 };
const pesDe = t => ((S.dados && S.dados.pesTalhao) || PES_PADRAO)[t] || 0;
const TRATORES = ['TR05', 'TR10', 'TR20 MASSEY GERGUSON 4275 - TRAÇADO 4X4', 'TR21 MASSEY GERGUSON 4275 - SIMPLES', 'TR22 NEW HOLLAND TL 5.80'];
const APLICACOES_REC = ['PULVERIZAÇÃO', 'ADUBAÇÃO', 'HERBICIDA', 'DRENCH'];   // o manejo operacional é lançado só pelo aplicador
const METODOS_REC = {
  'PULVERIZAÇÃO': ['Turbo atomizador'], 'ADUBAÇÃO': ['Adubadeira mecanizada', 'Via água de irrigação'],
  'HERBICIDA': ['Barra de herbicida'], 'DRENCH': ['Máquina de drench']
};
const PRIORIDADES_REC = [
  { v: 'URGENTE', l: 'Urgente (imediato ou até 1 dia)' }, { v: 'ALTA', l: 'Alta prioridade (2 dias)' }, { v: 'MÉDIA', l: 'Média prioridade (3 dias)' },
  { v: 'BAIXA', l: 'Baixa prioridade (5 dias)' }, { v: 'MUITO BAIXA', l: 'Muito baixa prioridade (7 dias)' }, { v: 'PROGRAMADO', l: 'Programado (acima de 7 dias)' }];
const ORDEM_PRIO = ['URGENTE', 'ALTA', 'MÉDIA', 'BAIXA', 'MUITO BAIXA', 'PROGRAMADO'];
const rotuloPrio = p => ({ 'URGENTE': 'Urgente', 'ALTA': 'Alta prioridade', 'MÉDIA': 'Média prioridade', 'BAIXA': 'Baixa prioridade', 'MUITO BAIXA': 'Muito baixa', 'PROGRAMADO': 'Programado' }[p] || p);
const FASES_REC = ['1. Indução e Botão Floral', '2. Florescimento (Antese)', '3. Frutificação', '4. Maturação e Colheita'];
const PREVISOES_REC = ['Safra Principal (Jan - Mar)', 'Entressafra 1 (Abr - Jun)', 'Entressafra 2 (Jul - Set)', 'Tardia (Out - Dez)'];
const NAO_MANEJO = V => !!V.aplicacao;
const ehAdubacao = V => V.aplicacao === 'ADUBAÇÃO';
const JUSTIFICATIVAS_REC = ['Controle Preventivo (Calendário)', 'Controle de Pragas (Monitoramento)', 'Controle de Doenças Fúngicas/Bacterianas', 'Controle de Plantas Daninhas',
  'Adubação de Produção / Manutenção', 'Adubação de Estimulação (Floração)', 'Correção de Deficiência Nutricional', 'Recomendação Baseada em Análise de Solo/Folha', 'Controle do Greening'];
const PSI_COM_PRODUTO = /^(Sim|Repasse)/;   // controle com aplicação: pede produtos e quem aplicou
const faixa = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
const BF_EVENTO = V => !!V.evento && V.evento !== 'Não';   // instalação ou troca de feromônio
const resp = () => ({ k: 'resp', t: 'select', l: 'Responsável', opts: RESP });
const assin = () => ({ k: 'assinatura', t: 'assinatura', l: 'Assinatura' });
const parseDH = s => { const d = new Date(s); return isNaN(d) ? null : d; };

const MODULOS = [
  { id: 'mapa_bf', nome: 'Mapa das armadilhas', icone: 'ph-map', custom: () => abrirMapaBF() },

  { id: 'receita', nome: 'Visita técnica', icone: 'ph-clipboard',
    campos: [
      { t: 'secao', l: 'Visita técnica' },
      { t: 'info', show: () => 'Agrônomo: Vinicius Soleira de Oliveira\nCultura: Lima Ácida · Variedade: Tahiti' },
      { k: 'datahora', t: 'datetime', l: 'Dia e hora da visita', now: true },
      { k: 'talhoes', t: 'multi', l: 'Talhão (pode escolher de 1 a 4)', opts: ['TALHÃO 1', 'TALHÃO 2', 'TALHÃO 3', 'TALHÃO 4'], subTitle: v => v,
        sub: [
          { k: 'avaliacao', t: 'textarea', l: 'Avaliação técnica (o que foi visto e o alvo)' },
          { k: 'fase', t: 'select', l: 'Fase fenológica', outro: true, opts: FASES_REC, showIf: NAO_MANEJO },
          { k: 'previsao', t: 'select', l: 'Previsão de colheita', opts: PREVISOES_REC, showIf: NAO_MANEJO }
        ] },
      { t: 'secao', l: 'Receita' },
      { k: 'aplicacao', t: 'select', l: 'Aplicação', opts: APLICACOES_REC },
      { k: 'tipo', t: 'select', l: 'Tipo', opcoesDe: V => V.aplicacao === 'ADUBAÇÃO' ? ['GRANULADA', 'FERTIRRIGAÇÃO'] : ['PREVENTIVA', 'CORRETIVA'], showIf: NAO_MANEJO },
      { k: 'areas', t: 'multi', l: 'Área (A, B ou as duas)', opts: ['A', 'B'] },
      { k: 'justificativa', t: 'select', l: 'Justificativa', outro: true, outroPrimeiro: true, opts: JUSTIFICATIVAS_REC },
      { k: 'cultura', t: 'text', l: 'Cultura', def: 'Lima Ácida', ro: true },
      { k: 'variedade', t: 'text', l: 'Variedade', def: 'Tahiti', ro: true },
      { t: 'info', show: () => 'O alvo da receita é o que você descreveu na avaliação técnica de cada talhão.' },
      { k: 'metodo', t: 'select', l: 'Método de aplicação', outro: true, opcoesDe: V => METODOS_REC[V.aplicacao] || [],
        padraoDe: V => ['PULVERIZAÇÃO', 'HERBICIDA', 'DRENCH'].includes(V.aplicacao) ? METODOS_REC[V.aplicacao][0] : undefined },
      // Na adubação estes campos começam como N/A (o técnico pode editar). Nas outras aplicações começam em branco (reentrada: 24 Horas, travada).
      { k: 'volume', t: 'select', l: 'Volume de calda', outro: true, opts: ['4000 Litros', '2000 Litros', '1000 Litros', '400 Litros', 'N/A'], showIf: NAO_MANEJO,
        chaveDe: V => V.aplicacao, padraoDe: V => ehAdubacao(V) ? 'N/A' : undefined },
      { k: 'ph', t: 'text', l: 'pH', decimal: true, numOuNA: true, showIf: NAO_MANEJO, preChave: V => V.aplicacao, pre: V => ehAdubacao(V) ? 'N/A' : '' },
      { k: 'vazao', t: 'text', l: 'Vazão (L/ha)', decimal: true, numOuNA: true, showIf: NAO_MANEJO, preChave: V => V.aplicacao, pre: V => ehAdubacao(V) ? 'N/A' : '' },
      { k: 'reentrada', t: 'text', l: 'Reentrada', showIf: NAO_MANEJO, preChave: V => V.aplicacao, pre: V => ehAdubacao(V) ? 'N/A' : '24 Horas', roDe: V => !ehAdubacao(V) },
      { k: 'carencia', t: 'select', l: 'Carência', opts: ['14 Dias', '7 Dias', '6 Dias', '5 Dias', '4 Dias', '3 Dias', '2 Dias', '1 Dia', 'N/A'], showIf: NAO_MANEJO,
        chaveDe: V => V.aplicacao, padraoDe: V => ehAdubacao(V) ? 'N/A' : undefined },
      { t: 'secao', l: 'Produtos', showIf: NAO_MANEJO },
      { k: 'produtos', t: 'produtos', modo: 'receita', l: 'Produtos (até 10)', showIf: NAO_MANEJO },
      { t: 'secao', l: 'Prioridade e assinatura' },
      { k: 'prioridade', t: 'select', l: 'Prioridade', opts: PRIORIDADES_REC },
      { k: 'dataProgramada', t: 'date', l: 'Data programada para aplicar', showIf: V => V.prioridade === 'PROGRAMADO' },
      { k: 'agronomo', t: 'text', l: 'Nome do agrônomo', def: 'Vinicius Soleira de Oliveira', ro: true },
      { k: 'assinatura', t: 'assinatura', l: 'Assinatura do agrônomo' }
    ] },

  { id: 'receitas_abertas', nome: 'Receitas em aberto', icone: 'ph-list-check', custom: () => abrirReceitasAbertas() },
  { id: 'aplicar', nome: 'Aplicação (receitas)', icone: 'ph-flask', custom: () => abrirAplicar() },

  { id: 'manejo', nome: 'Manejo operacional', icone: 'ph-tractor',
    campos: [
      { t: 'secao', l: 'Manejo operacional' },
      { t: 'info', show: () => 'Informe a operação, os talhões e áreas e a data e hora da realização.' },
      { k: 'operacao', t: 'select', l: 'Operação', outro: true, opts: ['Roçada', 'Poda', 'Desbrota'] },
      { k: 'itens', t: 'multi', l: 'Talhões (pode marcar vários)', opts: ['TALHÃO 1', 'TALHÃO 2', 'TALHÃO 3', 'TALHÃO 4'], subTitle: v => v, sub: [
        { k: 'areas', t: 'multi', l: 'Áreas deste talhão', opts: ['A', 'B'], subTitle: v => 'Área ' + v,
          sub: [{ k: 'inicio', t: 'datetime', l: 'Data e hora da realização', now: true }] }
      ] },
      { t: 'secao', l: 'Fechamento' },
      { k: 'aplicador', t: 'select', l: 'Aplicador', opts: RESP },
      { k: 'assinatura', t: 'assinatura', l: 'Assinatura do aplicador' }
    ] },

  { id: 'hidrometro', nome: 'Hidrômetro', icone: 'ph-gauge',
    // a leitura do mês some do alerta assim que é salva (mesmo sem internet) e passa a ser a "leitura anterior"
    aoSalvar: V => {
      const E = S.dados.estado = S.dados.estado || {}; E.hidro = E.hidro || {};
      Object.keys(V.itens || {}).forEach(h => { E.hidro[h] = { data: String(V.datahora), leitura: numero(V.itens[h].leitura) }; });
      try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
      renderAlertaReceitas();
    },
    campos: [
      { k: 'datahora', t: 'datetime', l: 'Data e hora', now: true },
      { k: 'itens', t: 'multi', l: 'Hidrômetro', opts: [{ v: 'A', l: 'A - Poço 1' }, { v: 'B', l: 'B - Poço 2' }], subTitle: v => 'Hidrômetro ' + (ROTULO_HID[v] || v),
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

  { id: 'irrigacao', nome: 'Irrigação', icone: 'ph-drop',
    campos: [
      { k: 'datahora', t: 'datetime', l: 'Data e hora', now: true },
      { k: 'itens', t: 'multi', l: 'Área (pode escolher várias)', subTitle: v => v,
        opts: UPS,
        sub: [
          { k: 'inicio', t: 'time', l: 'Início (hora)', preChave: (V, s) => s.__opt, pre: (V, E, s) => (HORARIOS_IRRIG[talhaoDe(s.__opt)] || [])[0] || '' },
          { k: 'fim', t: 'time', l: 'Final (hora)', preChave: (V, s) => s.__opt, pre: (V, E, s) => (HORARIOS_IRRIG[talhaoDe(s.__opt)] || [])[1] || '' },
          { t: 'info', show: (V, s) => HORARIOS_IRRIG[talhaoDe(s.__opt)] ? 'Horário do talhão já preenchido. Pode editar.' : 'Horário deste talhão ainda não definido: digite o início e o final.' },
          { t: 'info', show: (V, s) => {
            const i = minutos(s.inicio), f = minutos(s.fim); if (i == null || f == null) return '';
            let d = f - i; if (d < 0) d += 1440; return `Tempo de irrigação: ${pad2(Math.floor(d / 60))}h${pad2(d % 60)}`;
          } }
        ] },
      resp(), assin()
    ] },

  { id: 'tensiometro', nome: 'Tensiômetro', icone: 'ph-tensiometro',
    // a leitura salva passa a ser a "leitura anterior" na hora (mesmo sem internet)
    aoSalvar: V => {
      const E = S.dados.estado = S.dados.estado || {}; E.tensio = E.tensio || {};
      Object.keys(V.itens || {}).forEach(t => [20, 40].forEach(p => { const l = normTensio(V.itens[t]['l' + p]); if (l != null) E.tensio[`${t}|${p}`] = { data: String(V.datahora), leitura: l }; }));
      try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
    },
    campos: [
      { t: 'info', show: () => 'Leia os dois tensiômetros de cada talhão (20 cm e 40 cm) e digite o que o ponteiro marca, em kPa.\nO mostrador vai de 0 a −100: pode digitar com ou sem o sinal de menos (20 vale −20).\nQuanto mais NEGATIVA a leitura, mais seco está o solo.' },
      { k: 'datahora', t: 'datetime', l: 'Data e hora da leitura', now: true },
      { k: 'itens', t: 'multi', l: 'Talhão (pode escolher vários)', opts: TALHOES, subTitle: v => v,
        sub: [
          { k: 'l20', t: 'number', l: 'Leitura de 20 cm (kPa)', maxAbs: 100 },
          { t: 'info', show: (V, s, E) => infoTensio(s, E, 20, 'l20') },
          { k: 'l40', t: 'number', l: 'Leitura de 40 cm (kPa)', maxAbs: 100 },
          { t: 'info', show: (V, s, E) => infoTensio(s, E, 40, 'l40') }
        ] },
      resp(), assin()
    ] },

  { id: 'pluviometro', nome: 'Pluviômetro', icone: 'ph-cloud-rain',
    campos: [{ k: 'datahora', t: 'datetime', l: 'Data e hora', now: true }, { k: 'leitura', t: 'number', l: 'Leitura (mm)' }, resp(), assin()] },

  { id: 'hidrorepelente', nome: 'Hidrorrepelente (lavagem EPI)', icone: 'ph-shield-check',
    validar: V => { const l = lavagemSel(V); return l && V.resp !== l.aplicador ? `A lavagem precisa ser de ${l.aplicador}, que fez a aplicação.` : null; },
    aoSalvar: V => { if (V.refExec) S.dados.lavagens = lavagens().filter(l => l.idExec !== V.refExec); renderAlertaReceitas(); },
    campos: [
      // Depois de cada aplicação a lavagem é obrigatória: o app puxa o fim da aplicação (data, talhão e quem aplicou) e trava a data.
      { k: 'refExec', t: 'select', l: 'Aplicação que terminou (lavagem obrigatória)', opt: true, showIf: () => lavagens().length > 0,
        opts: () => lavagens().map(l => ({ v: l.idExec, l: rotuloLavagem(l) })),
        chaveDe: () => 'inicio', padraoDe: () => { const l = lavagensDoUsuario()[0] || lavagens()[0]; return l ? l.idExec : undefined; } },
      { t: 'info', show: V => { const l = lavagemSel(V); return l ? `Fim da aplicação: ${fmtData(l.data)} ${String(l.fim).slice(11, 16)}. A lavagem entra com esta data e com o mesmo aplicador.` : (lavagens().length ? 'Sem aplicação escolhida: lavagem avulsa, com a data que você informar.' : ''); } },
      { k: 'data', t: 'date', l: 'Data da lavagem', now: true, preChave: V => V.refExec, pre: V => { const l = lavagemSel(V); return l ? l.data : hoje(); }, roDe: V => !!lavagemSel(V) },
      { k: 'talhao', t: 'select', l: 'Talhão', opts: ['TALHÃO 1', 'TALHÃO 2', 'TALHÃO 3', 'TALHÃO 4'], chaveDe: V => V.refExec, padraoDe: V => (lavagemSel(V) || {}).talhao },
      { ...resp(), chaveDe: V => V.refExec, padraoDe: V => (lavagemSel(V) || {}).aplicador },
      { t: 'info', show: (V, s, E) => {
        if (!V.resp) return ''; const h = (E.hidrorep || {})[V.resp];
        const conj = h && h.conjunto === 'Conjunto 1' ? 'Conjunto 2' : 'Conjunto 1';
        const ult = h && h.n ? h.n[conj] : 0, n = ult ? (ult >= 30 ? 1 : ult + 1) : 1;
        return `Será registrado: ${conj} · lavagem nº ${n}`;
      } },
      assin()
    ] },

  { id: 'abastecimento', nome: 'Abastecimento', icone: 'ph-gas-pump',
    aoSalvar: V => ajustarDieselLocal('saida', V.litros, V.data),
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

  { id: 'diesel', nome: 'Chegada de diesel', icone: 'ph-truck',
    aoSalvar: V => ajustarDieselLocal('entrada', V.litros, V.data),
    campos: [{ k: 'data', t: 'date', l: 'Data da compra', now: true }, { k: 'nf', t: 'text', l: 'Nota fiscal' }, { k: 'litros', t: 'number', l: 'Litros adquiridos (entrada)' }, resp(), assin()] },

  { id: 'limpeza_local', nome: 'Limpeza do local', icone: 'ph-broom',
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

  { id: 'limpeza_equip', nome: 'Limpeza dos equipamentos', icone: 'ph-sparkle',
    campos: [
      { k: 'data', t: 'date', l: 'Data', now: true },
      { k: 'item', t: 'select', l: 'Item', opts: ['CAIXA', 'CARRETA', 'SACOLA'] },
      { k: 'qtd', t: 'number', l: 'Quantidade' },
      { k: 'produto', t: 'text', l: 'Produto utilizado', def: 'DIOXIPLUS A 0,1%', ro: true },
      { k: 'procedimento', t: 'select', l: 'Procedimento', opts: ['PULVERIZAÇÃO', 'SUBMERSÃO'] },
      resp(), assin()
    ] },

  { id: 'psilideo', nome: 'Monitoramento Psilídeo', icone: 'ph-bug',
    campos: [
      { t: 'secao', l: 'Local' },
      { t: 'info', show: () => 'Produtor: Flávia Freitas Pinto Ferreira\nPropriedade: Sítio Santa Izabel\nVariedade: Lima Ácida Tahiti' },
      { k: 'up', t: 'select', l: 'Talhão', opts: TALHOES },
      { k: 'areaHa', t: 'number', l: 'Área (ha)', ro: true, preChave: V => V.up, pre: V => infoTalhao(V.up).ha != null ? String(infoTalhao(V.up).ha) : '' },
      { k: 'metodo', t: 'text', l: 'Método utilizado', def: 'Armadilha adesiva', ro: true },
      { k: 'nPontos', t: 'number', l: 'Nº de pontos / plantas avaliadas', ro: true, preChave: V => V.up, pre: V => String(pesDe(talhaoDe(V.up)) || '') },
      { t: 'secao', l: 'Monitoramento' },
      { k: 'data', t: 'date', l: 'Data', now: true },
      { k: 'brotacao', t: 'select', l: 'Brotação presente?', opts: [
        { v: 'Ausente', l: 'Ausente (Sem brotação na planta)' },
        { v: 'Início / Leve', l: 'Início / Leve (Pequenos fluxos vegetativos começando a apontar)' },
        { v: 'Em expansão / Plena', l: 'Em expansão / Plena (Folhas ainda tenras e abertas, fase de maior atratividade para o psilídeo)' },
        { v: 'Madura / Fim', l: 'Madura / Fim (Folhas já endurecendo, cor verde mais escuro, perdendo a atratividade)' }] },
      { k: 'psilideo', t: 'select', l: 'Psilídeo encontrado?', opts: [
        { v: 'Ausente', l: 'Ausente (Zero psilídeos)' },
        { v: 'Apenas Ovos', l: 'Apenas Ovos (Indicativo de migração recente)' },
        { v: 'Apenas Ninfas', l: 'Apenas Ninfas (Necessita controle rápido, pois estão se alimentando da planta)' },
        { v: 'Apenas Adultos', l: 'Apenas Adultos (Insetos voadores, risco de disseminação do HLB)' },
        { v: 'Ninfas e Adultos', l: 'Ninfas e Adultos (Infestação estabelecida)' }] },
      { k: 'linha', t: 'number', l: 'Localização: Linha' },
      { k: 'planta', t: 'number', l: 'Localização: Nº da planta' },
      { k: 'controle', t: 'select', l: 'Controle necessário?', opts: [
        { v: 'Não', l: 'Não (Abaixo do nível de controle / Sem praga)' },
        { v: 'Sim - Preventivo', l: 'Sim - Preventivo (Sem praga, mas com brotação atraente ou talhão vizinho infestado)' },
        { v: 'Sim - Urgente', l: 'Sim - Urgente (Presença de ninfas ou adultos vivos)' },
        { v: 'Repasse / Reaplicação', l: 'Repasse / Reaplicação (Controle anterior falhou ou choveu logo após a aplicação)' },
        { v: 'Erradicação', l: 'Erradicação (Planta com HLB confirmado: o controle é eliminar a planta, não aplicar veneno)' }] },
      { t: 'secao', l: 'Aplicação do controle', showIf: V => PSI_COM_PRODUTO.test(V.controle || '') },
      { k: 'produtos', t: 'produtos', modo: 'psilideo', l: 'Produtos aplicados (até 10)', showIf: V => PSI_COM_PRODUTO.test(V.controle || '') },
      { k: 'respAplicacao', t: 'select', l: 'Responsável pela aplicação', opts: RESP, showIf: V => PSI_COM_PRODUTO.test(V.controle || '') },
      { k: 'assinaturaAplicador', t: 'assinatura', l: 'Assinatura de quem aplicou', showIf: V => PSI_COM_PRODUTO.test(V.controle || '') },
      { t: 'secao', l: 'Fechamento' },
      { k: 'obs', t: 'textarea', l: 'Observações / providências adotadas', opt: true },
      { k: 'respMonitor', t: 'select', l: 'Responsável pelo monitoramento', opts: 'monitores', outro: true, persist: 'monitores', caixaAlta: true },
      { k: 'assinatura', t: 'assinatura', l: 'Assinatura do monitor' }
    ] },

  { id: 'bichofurao', nome: 'Monitoramento Bicho-furão', icone: 'ph-target',
    // a 1ª coordenada capturada de um talhão passa a valer sempre (guarda no celular já; o servidor confirma)
    aoSalvar: V => {
      if (!V.coordenadasNova || coordFixa(V.up)) return;
      const m = String(V.coordenadasNova).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/); if (!m) return;
      S.dados.coordsBF = S.dados.coordsBF || {};
      S.dados.coordsBF[talhaoDe(V.up)] = { lat: parseFloat(m[1]), lng: parseFloat(m[2]), texto: String(V.coordenadasNova), data: hoje() };
      try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
    },
    campos: [
      { t: 'secao', l: 'Local e armadilha' },
      { t: 'info', show: () => 'Produtor: Flávia Freitas Pinto Ferreira\nPropriedade: Sítio Santa Izabel\nVariedade: Lima Ácida Tahiti' },
      { k: 'up', t: 'select', l: 'Talhão', opts: TALHOES },
      { t: 'info', show: (V, s, E) => {
        const u = V.up && (E.bicho || {})[V.up]; if (!u) return '';
        return `Última leitura deste talhão: armadilha "${u.idArmadilha}" · ${u.localizacao} · distância ${u.distancia}`;
      } },
      { t: 'acao', l: 'Usar os dados da última leitura', showIf: V => !!(V.up && (S.dados.estado.bicho || {})[V.up]),
        fazer: (V, E, ctx) => {
          const u = (E.bicho || {})[V.up]; if (!u) return;
          [['idArmadilha', u.idArmadilha], ['localizacao', u.localizacao], ['distancia', u.distancia]].forEach(([k, v]) => {
            const i = ctx.inputs[k]; if (i && v !== undefined && v !== '') { i.value = v; V[k] = String(v); }
          });
          ctx.refresh(); toast('Preenchido com a última leitura. Confira antes de salvar.');
        } },
      { k: 'areaHa', t: 'number', l: 'Área (ha)', ro: true, preChave: V => V.up, pre: V => infoTalhao(V.up).ha != null ? String(infoTalhao(V.up).ha) : '' },
      { k: 'idArmadilha', t: 'text', l: 'Identificação da armadilha' },
      { k: 'localizacao', t: 'text', l: 'Localização (linha onde está a armadilha)' },
      // coordenada: a primeira capturada de cada talhão vale sempre
      { k: 'coordenadas', t: 'text', l: 'Coordenada do talhão (a da 1ª captura)', ro: true, showIf: V => !!coordFixa(V.up), preChave: V => V.up, pre: V => (coordFixa(V.up) || {}).texto || '' },
      { k: 'coordenadasNova', t: 'gps', l: 'Capture a coordenada deste talhão (só na 1ª vez; depois fica guardada)', showIf: V => !!V.up && !coordFixa(V.up) },
      { k: 'nArmadilhas', t: 'number', l: 'Nº de armadilhas no talhão', ro: true, preChave: V => V.up, pre: V => infoTalhao(V.up).armadilhas != null ? String(infoTalhao(V.up).armadilhas) : '' },
      { k: 'distancia', t: 'text', l: 'Distância entre armadilhas' },
      { t: 'info', show: () => 'Referência de bula e pesquisa (Koppert/Cultivar): 1 armadilha para cada 10 ha, cerca de 350 m entre elas. Confira a bula do feromônio que você usa.' },
      { t: 'secao', l: 'Leitura da armadilha' },
      { k: 'data', t: 'date', l: 'Data da leitura', now: true },
      { k: 'armadilha', t: 'select', l: 'Armadilha nº', opcoesDe: V => faixa(1, Math.max(1, infoTalhao(V.up).armadilhas || 1)) },
      { k: 'adultos', t: 'select', l: 'Nº de adultos capturados', outro: true, opts: faixa(0, 20) },
      { t: 'info', show: (V, s, E) => {
        const a = numero(V.adultos); if (a == null) return '';
        const prev = (((E.bicho || {})[V.up] || {}).leituras || {})[String(V.armadilha)];
        const passada = prev != null ? ` Na leitura anterior desta armadilha foram ${prev}.` : '';
        if (a >= 10) return '⚠ 10 ou mais adultos em uma semana: atinge o nível de ação (referência da ficha).' + passada;
        if (a >= 6) return (prev != null && prev >= 6 ? '⚠ 6 ou mais adultos por duas semanas seguidas: atinge o nível de ação.' : 'Com 6 ou mais adultos, repetindo na próxima semana atinge o nível de ação.') + passada;
        return passada.trim();
      } },
      { k: 'limpeza', t: 'select', l: 'Limpeza / retirada realizada?', outro: true, opts: ['Sim', 'Não', 'Não necessário'] },
      { k: 'nivel', t: 'select', l: 'Atingiu nível de ação?', outro: true, opts: [
        { v: 'Não', l: 'Não' },
        { v: 'Sim (6+ por 2 semanas)', l: 'Sim - 6 ou mais adultos por 2 semanas seguidas' },
        { v: 'Sim (10+ em 1 semana)', l: 'Sim - 10 ou mais adultos em uma semana' }] },
      { k: 'medida', t: 'select', l: 'Medida de controle', outro: true, opts: ['Nenhuma', 'Troca do feromônio', 'Reposição / limpeza da armadilha', 'Controle conforme orientação técnica'] },
      { k: 'dataMedida', t: 'date', l: 'Data da medida de controle', now: true, showIf: V => V.medida && V.medida !== 'Nenhuma' },
      { k: 'respVisualizar', t: 'select', l: 'Responsável por visualizar a armadilha', opts: [...RESP, 'LUCAS MILHOSSI'] },
      { k: 'assinatura', t: 'assinatura', l: 'Assinatura de quem visualizou' },
      { t: 'secao', l: 'Feromônio (estoque)' },
      { k: 'evento', t: 'select', l: 'Houve instalação ou troca de feromônio nesta visita?', opts: ['Não', 'Instalação', 'Troca'], def: 'Não' },
      { k: 'dataTroca', t: 'date', l: 'Data da instalação / troca', now: true, showIf: BF_EVENTO },
      { k: 'feromonioId', t: 'select', l: 'Feromônio (marca)', showIf: BF_EVENTO, opts: () => {
        const todos = S.dados.produtos, fer = todos.filter(p => /ferom/i.test(p.tipo || ''));
        return [...(fer.length ? fer : todos).map(p => ({ v: p.id, l: p.nome })), { v: 'NOVO', l: '➕ Feromônio novo (não está na lista)' }];
      } },
      { k: 'nome', t: 'text', l: 'Nome / marca do feromônio novo', showIf: (V, s) => BF_EVENTO(V) && V.feromonioId === 'NOVO' },
      { k: 'lote', t: 'text', l: 'Lote do feromônio', showIf: BF_EVENTO },
      { k: 'qtd', t: 'number', l: 'Quantidade usada', showIf: BF_EVENTO },
      { k: 'unidade', t: 'select', l: 'Unidade', opts: UNID, def: 'UN', showIf: BF_EVENTO },
      { k: 'proximaTroca', t: 'date', l: 'Próxima troca prevista', showIf: BF_EVENTO },
      { t: 'secao', l: 'Fechamento' },
      { k: 'obs', t: 'textarea', l: 'Observações / providências adotadas', opt: true },
      { k: 'respMonitor', t: 'select', l: 'Responsável pelo monitoramento', opts: 'monitores', outro: true, persist: 'monitores', caixaAlta: true },
      { k: 'assinaturaMonitor', t: 'assinatura', l: 'Assinatura do responsável pelo monitoramento' }
    ] },

  { id: 'expedicao', nome: 'Expedição', icone: 'ph-send',
    aoSalvar: V => ajustarCaixasLocal('SAÍDA', String(V.destino || '').trim().toUpperCase(), somaCaixas(V.itens)),
    campos: [
      { t: 'secao', l: 'Carga' },
      { t: 'info', show: () => 'CPF/CNPJ de origem: 21.686.599/0001-39\nPropriedade: Sítio Santa Izabel\nOrigem: Faz. Monte Alegre s/n CEP: 14940000, Ibitinga/SP' },
      { k: 'data', t: 'date', l: 'Data', now: true },
      { k: 'hora', t: 'time', l: 'Hora de saída', now: true },
      { k: 'destino', t: 'select', l: 'Destino da carga', opts: 'destinos', outro: true, persist: 'destinos', caixaAlta: true },
      { k: 'cidadeDestino', t: 'text', l: 'Cidade destino', preChave: V => V.destino, pre: V => padraoDestino(V, 'cidade') },
      { k: 'docDestino', t: 'text', l: 'CPF/CNPJ destino', preChave: V => V.destino, pre: V => padraoDestino(V, 'doc') },
      { t: 'secao', l: 'Caixas por talhão' },
      { k: 'itens', t: 'multi', l: 'Talhão (pode escolher mais de um)', opts: UPS_EXPEDICAO, subTitle: v => v,
        sub: [{ k: 'qtd', t: 'number', inteiro: true, l: 'Quantidade de caixas' }] },
      { t: 'info', show: V => { const t = somaCaixas(V.itens); return t > 0 ? `Total da carga: ${t} caixas` : ''; } },
      { t: 'secao', l: 'Transporte e assinaturas' },
      { k: 'placa', t: 'text', l: 'Placa do veículo', upper: true },
      { k: 'motorista', t: 'text', l: 'Motorista', upper: true },
      { k: 'assinaturaMotorista', t: 'assinatura', l: 'Assinatura do comprador / motorista' },
      { k: 'respExpedicao', t: 'select', l: 'Responsável pela expedição', opts: 'expedidores', outro: true, persist: 'expedidores', caixaAlta: true },
      { k: 'assinaturaFazenda', t: 'assinatura', l: 'Assinatura de quem está na expedição' },
      { k: 'obs', t: 'textarea', l: 'Observações', opt: true }
    ],
    validar: V => {
      if (!(somaCaixas(V.itens) > 0)) return 'Informe a quantidade de caixas.';
      if (String(V.placa || '').replace(/[^A-Za-z0-9]/g, '').length < 7) return 'Confira a placa: ela tem 7 letras e números.';
    } },

  { id: 'estoque', nome: 'Estoque', icone: 'ph-package', custom: () => abrirEstoque() }
];

// telas de estoque (usam o mesmo motor)
const FORM_CONTAGEM = { id: 'estoque_contagem', nome: 'Contagem', campos: [
  { k: 'data', t: 'date', l: 'Data da contagem', now: true },
  { k: 'produtoId', t: 'select', l: 'Produto', opts: () => S.dados.produtos.map(p => ({ v: p.id, l: p.nome })) },
  { k: 'qtd', t: 'number', l: 'Quantidade que tem agora' },
  { k: 'unidade', t: 'select', l: 'Unidade', opts: UNID }
] };
// Chegou produto: só a foto da nota fiscal. O saldo do produto se acerta pela contagem, na aba Posição.
const formNota = p => ({ id: 'estoque_nota', nome: 'Nota fiscal recebida',
  campos: [
    ...(p ? [{ t: 'info', show: () => `Produto: ${p.nome}\nTire a foto da nota fiscal do que chegou.` }] : []),
    { k: 'produtoRef', t: 'text', l: 'Produto', def: p ? p.nome : '', ro: true, showIf: () => false },
    { k: 'quando', t: 'text', l: 'Quando', ro: true, showIf: () => false, preChave: () => 'agora', pre: () => agora() },
    { k: 'foto', t: 'foto', l: 'Foto da nota fiscal' },
    { t: 'info', show: () => 'Depois de conferir o que chegou, faça a contagem do produto na aba Posição, para o saldo ficar certo.' }
  ] });

// ---------- diesel: medição do tanque ----------
const FORM_MEDICAO_DIESEL = { id: 'diesel_medicao', nome: 'Medição do tanque de diesel',
  aoSalvar: V => ajustarDieselLocal('medicao', V.litros, V.data),
  campos: [
    { t: 'info', show: () => 'Meça o diesel que há no tanque agora. A partir desta medição, o app soma as chegadas e desconta os abastecimentos. Abastecimentos lançados no mesmo dia da medição já contam como incluídos nela.' },
    { k: 'data', t: 'date', l: 'Data da medição', now: true },
    { k: 'litros', t: 'number', l: 'Litros que há no tanque agora', minimo: 0 },
    resp(), assin()
  ] };

// controle de caixas: tudo que sai na expedição precisa voltar
const FORM_CX_RETORNO = { id: 'caixas_retorno', nome: 'Retorno de caixas',
  aoSalvar: V => ajustarCaixasLocal('RETORNO', String(V.destino || '').trim().toUpperCase(), V.qtd),
  campos: [
    { k: 'data', t: 'date', l: 'Data do retorno', now: true },
    { k: 'destino', t: 'select', l: 'De onde as caixas voltaram', opts: 'destinos', outro: true, persist: 'destinos', caixaAlta: true },
    { k: 'qtd', t: 'number', inteiro: true, l: 'Quantidade de caixas que voltaram' },
    { k: 'resp', t: 'select', l: 'Responsável pelo recebimento', opts: 'expedidores', outro: true, persist: 'expedidores', caixaAlta: true },
    { k: 'obs', t: 'textarea', l: 'Observações', opt: true }
  ] };
const FORM_CX_CONTAGEM = { id: 'caixas_contagem', nome: 'Contagem de caixas',
  aoSalvar: V => ajustarCaixasLocal('CONTAGEM', '', V.qtd),
  campos: [
    { k: 'data', t: 'date', l: 'Data da contagem', now: true },
    { k: 'qtd', t: 'number', inteiro: true, l: 'Quantas caixas existem na fazenda agora?' },
    { k: 'resp', t: 'select', l: 'Responsável pela contagem', opts: 'expedidores', outro: true, persist: 'expedidores', caixaAlta: true }
  ] };

// atualiza na hora o saldo mostrado no celular (o servidor confirma na próxima sincronização)
function ajustarCaixasLocal(tipo, destino, qtd) {
  const c = S.dados.caixas = S.dados.caixas || { naFazenda: 0, temContagem: false, contagemQtd: 0, contagemData: '', porDestino: [], movimentos: [] };
  const q = parseInt(qtd, 10) || 0;
  if (tipo === 'CONTAGEM') { c.naFazenda = q; c.temContagem = true; c.contagemQtd = q; c.contagemData = hoje(); }
  else {
    c.naFazenda += tipo === 'RETORNO' ? q : -q;
    let o = c.porDestino.find(x => x.destino === destino);
    if (!o) { o = { destino, saiu: 0, voltou: 0, falta: 0 }; c.porDestino.push(o); }
    if (tipo === 'SAÍDA') o.saiu += q; else o.voltou += q;
    o.falta = o.saiu - o.voltou;
  }
  (c.movimentos = c.movimentos || []).unshift({ data: hoje(), tipo, destino, qtd: q });
}

/* =========================================================
   MOTOR DE FORMULÁRIOS
   ========================================================= */
function opcoes(f, st) {
  let o = typeof f.opts === 'function' ? f.opts(st) : f.opts;
  if (typeof o === 'string') o = [...new Set([...(LISTAS_BASE[o] || []), ...((S.dados.listas || {})[o] || [])])];
  return (o || []).map(x => typeof x === 'object' ? x : { v: x, l: x });
}

function renderCampo(f, st, ctx) {
  if (f.t === 'secao') {
    const h = el('h3', { class: 'secao' }, f.l);
    if (f.showIf) ctx.shows.push(() => { h.hidden = !f.showIf(ctx.V, st); });
    return h;
  }
  const w = el('div', { class: 'campo' });
  const obrig = !f.opt;
  const rotulo = f.l ? el('label', { class: 'rot' }, f.l, obrig && f.t !== 'info' ? el('span', { class: 'obrig' }, ' *') : null) : null;
  const checa = fn => ctx.checks.push({ w, fn: () => (!w.isConnected || w.closest('[hidden]')) ? null : fn() });
  if (f.showIf) ctx.shows.push(() => { w.hidden = !f.showIf(ctx.V, st); });

  switch (f.t) {
    case 'text': case 'number': case 'date': case 'datetime': case 'time': case 'textarea': {
      const tipo = { text: 'text', number: 'number', date: 'date', datetime: 'datetime-local', time: 'time' }[f.t];
      const inp = f.t === 'textarea' ? el('textarea', { rows: 4 }) : el('input', { type: tipo, autocomplete: 'off', inputmode: f.t === 'number' ? (f.inteiro ? 'numeric' : 'decimal') : (f.decimal ? 'decimal' : null), step: f.t === 'number' ? (f.inteiro ? '1' : 'any') : null, min: f.inteiro ? '0' : null });
      const v0 = f.def !== undefined ? f.def : f.now ? (f.t === 'date' ? hoje() : f.t === 'time' ? hhmm() : agora()) : '';
      inp.value = v0; st[f.k] = v0; if (f.ro) inp.readOnly = true;
      ctx.inputs[f.k] = inp;
      if (f.upper) { inp.classList.add('caixa-alta'); ctx.finalizers.push(() => { st[f.k] = String(st[f.k] ?? '').trim().toUpperCase(); }); }
      inp.addEventListener('input', () => { st[f.k] = inp.value; });
      if (f.pre) ctx.dyns.push(() => {   // preenche com o último valor conhecido quando a "chave" (ex.: a UP) muda; o usuário pode editar
        const chave = String(f.preChave ? f.preChave(ctx.V, st) : '');
        if (inp.dataset.pre === chave) return;
        inp.dataset.pre = chave;
        const v = f.pre(ctx.V, S.dados.estado, st);
        if (v !== undefined && v !== null && String(v) !== '') { inp.value = v; st[f.k] = String(v); inp.dataset.autoPre = '1'; }
        else if (inp.dataset.autoPre === '1') { inp.value = ''; st[f.k] = ''; inp.dataset.autoPre = '0'; }   // trocou para um destino sem padrão: limpa para digitar
      });
      if (f.dyn) ctx.dyns.push(() => {
        const r = f.dyn(ctx.V, S.dados.estado);
        if (r.auto) { if (inp.value !== String(r.value)) { inp.value = r.value; st[f.k] = String(r.value); } inp.dataset.auto = '1'; }
        else if (inp.dataset.auto === '1') { inp.value = ''; st[f.k] = ''; inp.dataset.auto = '0'; }
        inp.readOnly = !!r.ro;
      });
      if (f.roDe) ctx.dyns.push(() => { inp.readOnly = !!f.roDe(ctx.V, st); });
      if (obrig || f.inteiro || f.positivo || f.numOuNA || f.minimo != null || f.maxAbs != null) checa(() => {
        const v = String(st[f.k] ?? '').trim();
        if (v === '') return obrig ? `Preencha: ${f.l}` : null;
        if (f.numOuNA && v !== '' && !/^n\s*\/?\s*a$/i.test(v) && numero(v) == null) return `${f.l}: digite um número ou N/A`;
        if (f.maxAbs != null && v !== '' && !(Math.abs(numero(v)) <= f.maxAbs)) return `${f.l}: a escala do mostrador vai de 0 a −${f.maxAbs}`;
        if (f.minimo != null && v !== '' && !(numero(v) >= f.minimo)) return `${f.l}: use um número a partir de ${f.minimo}`;
        if (f.positivo && !(numero(v) > 0)) return `${f.l}: informe um número maior que zero`;
        return f.inteiro && !/^\d+$/.test(v) ? `${f.l}: use só números inteiros (sem vírgula nem ponto)` : null;
      });
      w.append(rotulo, inp);
      break;
    }
    case 'select': {
      const sel = el('select');
      const txt = el('input', { type: 'text', placeholder: 'Digite aqui…', hidden: true, autocomplete: 'off' });
      const popular = lista => {
        const outro = f.outro ? el('option', { value: '__outro' }, 'Outro (digitar)…') : null;
        sel.replaceChildren(...[el('option', { value: '' }, 'Selecione…'), f.outroPrimeiro ? outro : null, ...lista.map(o => el('option', { value: o.v }, o.l)), f.outroPrimeiro ? null : outro].filter(Boolean));
      };
      const sync = () => {
        if (sel.value === '__outro') { txt.hidden = false; st[f.k] = f.caixaAlta ? txt.value.trim().replace(/\s+/g, ' ').toUpperCase() : txt.value.trim(); st[f.k + '__novo'] = true; }
        else { txt.hidden = true; st[f.k] = sel.value; delete st[f.k + '__novo']; }
      };
      popular(opcoes(f, st));
      if (f.def !== undefined) { sel.value = f.def; if (sel.selectedIndex < 0) sel.value = ''; }   // padrão que não está na lista: deixa em branco
      st[f.k] = sel.value;
      if (f.opcoesDe) ctx.dyns.push(() => {   // lista que muda conforme outro campo (ex.: método de aplicação depende do tipo de aplicação)
        const lista = (f.opcoesDe(ctx.V, st) || []).map(x => typeof x === 'object' ? x : { v: x, l: x });
        const chave = JSON.stringify(lista); if (sel.dataset.lista === chave) return;
        sel.dataset.lista = chave;
        const atual = st[f.k]; popular(lista);
        const padrao = f.padraoDe ? f.padraoDe(ctx.V, st) : undefined;
        sel.value = lista.some(o => o.v === atual) ? atual : (padrao !== undefined ? padrao : '');
        if (sel.selectedIndex < 0) sel.value = '';
        sync();
      });
      if (f.padraoDe && !f.opcoesDe) ctx.dyns.push(() => {   // valor inicial que depende de outro campo; o usuário pode trocar
        const chave = String(f.chaveDe ? f.chaveDe(ctx.V, st) : '');
        if (sel.dataset.chavePad === chave) return;
        sel.dataset.chavePad = chave;
        const p = f.padraoDe(ctx.V, st);
        if (p !== undefined) { sel.value = p; if (sel.selectedIndex < 0) sel.value = ''; sel.dataset.autoPad = '1'; }
        else if (sel.dataset.autoPad === '1') { sel.value = ''; sel.dataset.autoPad = '0'; }
        sync();
      });
      sel.addEventListener('change', sync); txt.addEventListener('input', sync);
      if (f.persist) ctx.persist.push(() => st[f.k + '__novo'] && st[f.k] ? { lista: f.persist, valor: st[f.k] } : null);
      if (obrig) checa(() => !st[f.k] ? `Preencha: ${f.l}` : null);
      w.append(rotulo, sel, txt);
      break;
    }
    case 'multi': {
      const sel = {}; st[f.k] = sel;
      const chips = el('div', { class: 'chips' }), blocos = el('div');
      const temSub = (f.sub || []).length > 0;
      opcoes(f, st).forEach(o => {
        const sub = { __opt: o.v };
        const bloco = el('div', { class: 'bloco', hidden: true }, temSub ? el('h4', {}, f.subTitle ? f.subTitle(o.v) : o.l) : null);
        (f.sub || []).forEach(sf => bloco.append(renderCampo(sf, sub, ctx)));
        const chip = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: () => {
          const on = !chip.classList.contains('on');
          chip.classList.toggle('on', on); chip.setAttribute('aria-pressed', on); bloco.hidden = !on || !temSub;
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
      const botao = cam => el('label', { class: 'btn-foto' + (cam ? '' : ' sec') }, ico(cam ? 'camera' : 'image'), cam ? 'Tirar foto' :'Galeria',
        el('input', { type: 'file', accept: 'image/*', capture: cam ? 'environment' : null, hidden: true, onchange: async e => {
          const arq = e.target.files[0]; if (!arq) return;
          st[f.k] = await comprimir(arq); prev.src = st[f.k]; prev.hidden = false; ctx.refresh();
        } }));
      if (obrig) checa(() => st[f.k] ? null : `Tire a foto: ${f.l}`);
      st[f.k] = '';
      w.append(rotulo, el('div', { class: 'fotos' }, botao(true), botao(false)), prev);
      break;
    }
    case 'acao': {   // botão que executa uma ação sobre o formulário (ex.: copiar a última leitura)
      w.append(el('button', { type: 'button', class: 'btn sec', style: 'margin-top:0', onclick: () => f.fazer(ctx.V, S.dados.estado, ctx) }, f.l));
      break;
    }
    case 'gps': {
      const saida = el('input', { type: 'text', readonly: true, placeholder: 'Toque no botão para capturar' });
      const btn = el('button', { type: 'button', class: 'btn sec', style: 'margin-top:8px' }, 'Capturar coordenadas do celular');
      btn.onclick = () => {
        if (!navigator.geolocation) return toast('Este aparelho não permite capturar a localização.', 'erro');
        btn.disabled = true; btn.textContent = 'Buscando sinal de GPS…';
        navigator.geolocation.getCurrentPosition(p => {
          st[f.k] = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`;
          saida.value = `${st[f.k]}  (precisão ±${Math.round(p.coords.accuracy)} m)`;
          btn.disabled = false; btn.textContent = 'Capturar de novo'; ctx.refresh();
        }, () => { toast('Não consegui pegar a localização. Confira a permissão de GPS do navegador.', 'erro'); btn.disabled = false; btn.textContent = 'Capturar coordenadas do celular'; },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
      };
      st[f.k] = '';
      if (obrig) checa(() => st[f.k] ? null : `Capture as coordenadas: ${f.l}`);
      w.append(rotulo, saida, btn);
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
  const psi = f.modo === 'psilideo', rec = f.modo === 'receita';
  const adub = V => rec && V.aplicacao === 'ADUBAÇÃO', pulv = V => !adub(V), novoP = (V, s) => s.id === 'NOVO';
  const campos = () => [
    { k: 'id', t: 'select', l: 'Produto', opts: () => [...S.dados.produtos.map(p => ({ v: p.id, l: p.nome })), { v: 'NOVO', l: '➕ Outro (produto novo)' }] },
    { k: 'nome', t: 'text', l: 'Nome do produto novo', showIf: novoP },
    { k: 'principio', t: 'text', l: 'Princípio ativo', showIf: novoP },
    { k: 'classe', t: 'select', l: 'Classe toxicológica', outro: true, opts: () => S.dados.classes, showIf: novoP },
    { t: 'info', show: (V, s) => { const p = S.dados.produtos.find(x => x.id === s.id); return p ? `Princípio ativo: ${p.principio || '-'}\nClasse: ${p.classe || '-'}${rec ? '\nConcentração salva: ' + (p.concentracao || 'ainda não cadastrada') : ''}` : ''; } },
    ...(rec ? [{ k: 'concentracao', t: 'text', l: 'Concentração (ex.: 18 EC, 250 g/L)', preChave: (V, s) => s.id,
      pre: (V, E, s) => { const p = S.dados.produtos.find(x => x.id === s.id); return p ? p.concentracao : ''; } }] : []),
    { k: 'dosagem', t: 'number', l: rec ? 'Dosagem (por bomba)' : 'Dosagem', showIf: pulv },
    { k: 'dosePlanta', t: 'number', l: 'Dose por planta', showIf: adub },
    { k: 'unidade', t: 'select', l: 'Unidade', opts: UNID },
    ...(psi ? [{ k: 'datahora', t: 'datetime', l: 'Data e hora da aplicação', now: true }] : []),
    { t: 'info', show: (V, s) => adub(V) && numero(s.dosePlanta) > 0 ? 'Dose de cada talhão (pés × dose por planta):\n' + Object.keys(V.talhoes || {}).sort().map(t => `${t}: ${fmt(pesDe(t))} pés → ${fmt(pesDe(t) * numero(s.dosePlanta), 3)} ${s.unidade || ''}`).join('\n') : '' }
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
  const ctx = { V: {}, inputs: {}, checks: [], shows: [], dyns: [], infos: [], finalizers: [], persist: [] };
  ctx.refresh = () => { ctx.dyns.forEach(f => f()); ctx.shows.forEach(f => f()); ctx.infos.forEach(f => f()); };
  container.replaceChildren(); S.emFormulario = true;
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
    const fp = impressao(m.id, ctx.V);
    if (await jaTemIgual(fp) && !confirm('Já existe um lançamento igual a este, salvo há pouco. Salvar mesmo assim?')) return;
    btn.disabled = true;
    const id = uid();
    const payload = { acao: 'salvar', modulo: m.id, id_transacao: id, dados: JSON.parse(JSON.stringify(ctx.V)), novasListas: ctx.persist.map(f => f()).filter(Boolean) };
    if (!(await guardar({ id_transacao: id, payload, criado: Date.now(), titulo: m.nome, fp }))) { btn.disabled = false; return; }
    (payload.novasListas).forEach(n => { const l = S.dados.listas[n.lista] = S.dados.listas[n.lista] || []; if (!l.includes(n.valor)) l.push(n.valor); });
    if (m.aoSalvar) { try { m.aoSalvar(ctx.V, id); } catch (e) {} }
    toast('Guardado no celular ✔ Envia sozinho quando tiver internet');
    onSalvo(); sincronizar();
  };
  container.append(btn);
  ctx.refresh();
  return ctx;
}

/* ---------- navegação dos módulos ---------- */
function ultimoTexto(m) {
  if (m.id === 'estoque' && dieselEmAlerta()) return `Diesel: ${fmt(S.dados.diesel.litros, 0)} L`;
  if (m.id === 'estoque' && chegadas().length) return `${chegadas().length} ${chegadas().length === 1 ? 'chegada' : 'chegadas'} para aprovar`;
  if (m.id === 'hidrometro' && recebeAviso() && hidrometroPendente()) return 'Leitura do mês pendente';
  if (m.id === 'hidrorepelente' && recebeAviso() && lavagensDoUsuario().length) { const n = lavagensDoUsuario().length; return `${n} ${n === 1 ? 'lavagem pendente' : 'lavagens pendentes'}`; }
  if (m.id === 'receitas_abertas') { const n = (S.dados.receitas || []).length; return n ? `${n} em aberto` : 'Nenhuma em aberto'; }
  if (m.id === 'aplicar') { const n = (S.dados.receitas || []).length; return n ? `${n} ${n === 1 ? 'receita' : 'receitas'} para aplicar` : 'Nenhuma receita aberta'; }
  if (m.id === 'estoque') { const n = (S.dados.estoque || []).length; return n ? (n === 1 ? '1 produto' : `${n} produtos`) : ''; }
  const r = ((S.dados.ultimos || {})[m.id] || [])[0];
  if (!r) return '';
  return `Último: ${String(r[0]).slice(0, 10)}`;
}
// Seções do menu, na ordem de cada uma. Para renomear uma seção ou mudar um bloco de lugar, é só editar esta lista.
const SECOES_MENU = [
  { titulo: 'Aplicação e monitoramento', ids: ['receitas_abertas', 'receita', 'aplicar', 'manejo', 'psilideo', 'bichofurao', 'mapa_bf'] },
  { titulo: 'Água e irrigação', ids: ['hidrometro', 'irrigacao', 'tensiometro', 'pluviometro'] },
  { titulo: 'Limpeza', ids: ['limpeza_local', 'limpeza_equip', 'hidrorepelente'] },
  { titulo: 'Diesel', ids: ['abastecimento', 'diesel'] },
  { titulo: 'Expedição', ids: ['expedicao'] },
  { titulo: 'Estoque', ids: ['estoque'] }
];
function montarMenu() {
  renderAlertaReceitas();
  const g = $('#grid-modulos'); g.replaceChildren();
  const visivel = m => !(['receita', 'receitas_abertas'].includes(m.id) && S.perfil === 'aplicador') && !(m.id === 'manejo' && S.perfil === 'tecnico');
  const bloco = m => el('button', { class: 'mod' + classeAlertaModulo(m), onclick: () => abrirModulo(m) },
    el('span', { class: 'ic' }, ico(m.icone.replace('ph-', ''))), el('b', {}, m.nome), el('small', {}, ultimoTexto(m)));
  const porId = Object.fromEntries(MODULOS.map(m => [m.id, m]));
  const secao = (n, titulo, mods) => g.append(el('section', { class: 'menu-secao' },
    el('h2', { class: 'menu-titulo' }, el('span', { class: 'menu-num' }, String(n)), titulo), el('div', { class: 'menu' }, mods.map(bloco))));
  let n = 0;
  SECOES_MENU.forEach(sec => { const mods = sec.ids.map(id => porId[id]).filter(m => m && visivel(m)); if (mods.length) secao(++n, sec.titulo, mods); });
  const usados = new Set(SECOES_MENU.flatMap(x => x.ids)), sobras = MODULOS.filter(m => !usados.has(m.id) && visivel(m));
  if (sobras.length) secao(++n, 'Outros', sobras);   // garantia: um bloco que não está em nenhuma seção não some
  g.append(el('p', { class: 'versao' }, `Versão ${APP_VERSAO}${S.nome ? ' · ' + S.nome : ''} · `,
    el('button', { type: 'button', class: 'link', style: 'margin:0;padding:0;font-size:12px', onclick: atualizarListas }, 'atualizar listas'), ' · ',
    el('button', { type: 'button', class: 'link', style: 'margin:0;padding:0;font-size:12px', onclick: sairDoAparelho }, 'sair')));
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



// O mostrador do tensiômetro só tem valores negativos (0 a -100 kPa): a leitura vale com ou sem o sinal de menos.
const normTensio = v => { const n = numero(v); return n == null ? null : (n === 0 ? 0 : -Math.abs(n)); };
const kpaTxt = n => (n < 0 ? '−' : '') + fmt(Math.abs(n));
// leitura anterior e variação (+ ou -) do tensiômetro de um talhão, como no hidrômetro
function infoTensio(s, E, prof, chave) {
  const ant = (E.tensio || {})[`${s.__opt}|${prof}`];
  if (!ant) return `${prof} cm: primeira leitura deste tensiômetro.`;
  const prev = normTensio(ant.leitura);   // leituras antigas guardadas sem o sinal também valem como negativas
  const base = `${prof} cm · leitura anterior: ${kpaTxt(prev)} kPa em ${fmtData(ant.data)} ${String(ant.data).slice(11, 16)}`;
  const l = normTensio(s[chave]); if (l == null) return base;
  const v = Math.round((l - prev) * 10) / 10;
  return `${base}\nVariação: ${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))} kPa${v < 0 ? ' (solo mais seco)' : v > 0 ? ' (solo mais úmido)' : ' (sem mudança)'}`;
}

/* =========================================================
   MAPA DAS ARMADILHAS DE BICHO-FURÃO (1ª coordenada de cada talhão)
   ========================================================= */
const svgEl = (tag, attrs = {}, ...kids) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  kids.flat().forEach(c => { if (c != null) e.append(c); });
  return e;
};
const svgTxt = (attrs, txt) => { const t = svgEl('text', attrs); t.textContent = txt; return t; };
const linkPonto = p => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
function pontosBF() {
  const c = S.dados.coordsBF || {};
  return TALHOES.map(t => ({ t, ...(c[t] || {}) })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}
// croqui sem fundo de satélite (o app não carrega imagens da internet): posições relativas, norte para cima, com escala
function croquiBF(pontos) {
  const W = 340, H = 250, pad = 38, lat0 = pontos.reduce((a, p) => a + p.lat, 0) / pontos.length, lng0 = pontos.reduce((a, p) => a + p.lng, 0) / pontos.length;
  const xy = pontos.map(p => ({ ...p, mx: (p.lng - lng0) * Math.cos(lat0 * Math.PI / 180) * 111320, my: (p.lat - lat0) * 110540 }));
  const larg = Math.max(120, Math.max(...xy.map(p => Math.abs(p.mx))) * 2), alt = Math.max(120, Math.max(...xy.map(p => Math.abs(p.my))) * 2);
  const esc = Math.min((W - 2 * pad) / larg, (H - 2 * pad) / alt);   // pixels por metro
  const px = p => W / 2 + p.mx * esc, py = p => H / 2 - p.my * esc;
  const nice = [20, 50, 100, 200, 500, 1000, 2000, 5000].find(n => n * esc >= 50) || 5000;
  return svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'croqui', role: 'img', 'aria-label': 'Croqui das armadilhas de bicho-furão' },
    svgEl('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 14, class: 'croqui-fundo' }),
    svgEl('path', { d: `M${W - 24} 38 l6 -16 l6 16 M${W - 18} 22 v-10`, class: 'croqui-norte' }),
    svgTxt({ x: W - 18, y: 52, 'text-anchor': 'middle', class: 'croqui-txt' }, 'N'),
    svgEl('line', { x1: 16, y1: H - 18, x2: 16 + nice * esc, y2: H - 18, class: 'croqui-escala' }),
    svgTxt({ x: 16, y: H - 24, class: 'croqui-txt' }, nice >= 1000 ? `${nice / 1000} km` : `${nice} m`),
    xy.map(p => svgEl('g', {},
      svgEl('circle', { cx: px(p), cy: py(p), r: 9, class: 'croqui-ponto' }),
      svgTxt({ x: px(p), y: py(p) + 4, 'text-anchor': 'middle', class: 'croqui-num' }, p.t.replace('TALHÃO ', '')),
      svgTxt({ x: px(p), y: py(p) - 14, 'text-anchor': 'middle', class: 'croqui-txt' }, `${p.t.replace('TALHÃO ', 'T')} · ${fmt(infoTalhao(p.t).ha)} ha`))));
}
function kmlBF(pontos) {
  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Armadilhas de bicho-furão - Sítio Santa Izabel</name>` +
    pontos.map(p => { const i = infoTalhao(p.t); return `<Placemark><name>${xml(p.t)}</name><description>${xml(`${fmt(i.ha)} ha · ${i.armadilhas} armadilha(s) · capturada em ${fmtData(p.data)}`)}</description><Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`; }).join('') +
    `</Document></kml>`;
}
function baixarKml(pontos) {
  const url = URL.createObjectURL(new Blob([kmlBF(pontos)], { type: 'application/vnd.google-earth.kml+xml' }));
  const a = el('a', { href: url, download: 'armadilhas_bicho_furao.kml' }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
function abrirMapaBF() {
  mostrar('tela-form'); S.tela = 'mapa-bf'; $('#form-titulo').textContent = 'Mapa das armadilhas'; $('#form-ultimos').hidden = true;
  const root = $('#form-root'); root.replaceChildren();
  const pontos = pontosBF();
  if (!pontos.length) { root.append(el('p', { class: 'sub' }, 'Ainda não há coordenada guardada. No Monitoramento Bicho-furão, a primeira coordenada capturada de cada talhão fica guardada e aparece aqui.')); return; }
  root.append(el('p', { class: 'sub' }, 'Cada talhão aparece com a coordenada da 1ª captura. Este croqui mostra as posições relativas; para ver no mapa de satélite, use os botões do Google Maps.'));
  root.append(croquiBF(pontos));
  TALHOES.forEach(t => {
    const p = pontos.find(x => x.t === t), i = infoTalhao(t);
    root.append(el('div', { class: 'cartao' }, el('strong', {}, t),
      el('span', { class: 'sub', style: 'display:block' }, `${fmt(i.ha)} ha · ${i.armadilhas} ${i.armadilhas === 1 ? 'armadilha' : 'armadilhas'}`),
      p ? el('span', { class: 'sub', style: 'display:block' }, `${p.texto} · capturada em ${fmtData(p.data)}`) : el('span', { class: 'sub', style: 'display:block' }, 'Ainda sem coordenada: capture no próximo monitoramento.'),
      p ? el('a', { class: 'btn sec', href: linkPonto(p), target: '_blank', rel: 'noopener', style: 'margin-top:10px;text-align:center;text-decoration:none' }, 'Abrir no Google Maps') : null));
  });
  root.append(el('a', { class: 'btn', href: `https://www.google.com/maps/dir/${pontos.map(p => `${p.lat},${p.lng}`).join('/')}`, target: '_blank', rel: 'noopener', style: 'text-align:center;text-decoration:none' }, 'Ver todos no Google Maps'));
  root.append(el('button', { type: 'button', class: 'btn sec', onclick: () => baixarKml(pontos) }, 'Baixar o mapa (arquivo KML)'));
  root.append(el('p', { class: 'sub' }, 'O arquivo KML abre no Google Earth e no Google Meu Mapas, com um marcador em cada talhão. Para trocar a coordenada de um talhão, corrija na aba coordenadas_talhao da planilha.'));
}

/* =========================================================
   CHEGADA DE PRODUTOS PELA NOTA FISCAL (relatório do DANFE View): o usuário aprova o que chegou
   ========================================================= */
const UN_NF = { GL: ['galão', 'galões'], BAL: ['balde', 'baldes'], PCT: ['pacote', 'pacotes'], SAC: ['saco', 'sacos'], SC: ['saco', 'sacos'], UN: ['unidade', 'unidades'], UND: ['unidade', 'unidades'],
  CX: ['caixa', 'caixas'], 'PC-': ['peça', 'peças'], PC: ['peça', 'peças'], KG: ['kg', 'kg'], L: ['litro', 'litros'], LT: ['litro', 'litros'] };
const nomeUnNF = (un, n) => (UN_NF[String(un).toUpperCase()] || [String(un).toLowerCase(), String(un).toLowerCase()])[n === 1 ? 0 : 1];
const chegadas = () => S.dados.chegadas || [];
// o que já foi aprovado/recusado neste celular e ainda não foi enviado sai da lista
async function ajustarChegadasComFila(lista) {
  const feitos = new Set((await DB.todos()).filter(i => i.status !== 'erro' && i.payload && i.payload.modulo === 'nfe_aprovar').map(i => i.payload.dados.id));
  return lista.filter(c => !feitos.has(c.id));
}
function textoEmbalagem(c) {
  if (c.embValor > 0 && !['L', 'KG', 'LT'].includes(String(c.unNF).toUpperCase()))
    return `${fmt(c.qtdNF)} ${nomeUnNF(c.unNF, c.qtdNF)} × ${fmt(c.embValor)} ${c.embUn} = ${fmt(c.totalQtd)} ${c.totalUn}`;
  return `${fmt(c.totalQtd)} ${c.totalUn}`;
}
function renderAlertaChegadas() {
  const box = $('#alerta-chegadas'); if (!box) return;
  const n = chegadas().length;
  if (!n) { box.hidden = true; return; }
  box.hidden = false; box.className = 'alerta-rec prio-3';
  box.replaceChildren(el('span', { class: 'alerta-txt' },
    el('b', {}, n === 1 ? 'Chegou 1 produto na nota fiscal: aprove' : `Chegaram ${n} produtos nas notas fiscais: aprove`),
    el('small', {}, 'Confirme o que chegou para entrar no estoque')),
    el('span', { class: 'prio' }, 'Aprovar'));
}
async function enviarAprovacao(c, dados, aviso) {
  const id = uid();
  const payload = { acao: 'salvar', modulo: 'nfe_aprovar', id_transacao: id, dados: { id: c.id, ...dados }, novasListas: [] };
  if (!(await guardar({ id_transacao: id, payload, criado: Date.now(), titulo: `${dados.decisao === 'ignorar' ? 'Recusa' : 'Chegada'}: ${c.nome}` }))) return false;
  S.dados.chegadas = chegadas().filter(x => x.id !== c.id);
  try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
  toast(aviso); renderAlertaReceitas(); sincronizar();
  return true;
}
function cartaoChegada(c, redesenhar) {
  const diesel = c.tipo === 'DIESEL', exigePA = c.tipo === 'DEFENSIVO';   // defensivo sem princípio ativo não serve para achar produto equivalente
  const noCadastro = (S.dados.produtos || []).find(p => p.id === c.sugestaoId);
  // só aprova direto o que já foi confirmado antes (e, no defensivo, já tem princípio ativo); uma sugestão parecida pede conferência
  const pronto = diesel || (c.sugestaoId && c.dicionario && (!exigePA || c.principio || (noCadastro && noCadastro.principio)));
  const painel = el('div', { class: 'painel-prod', hidden: true });
  const sel = el('select', {}, el('option', { value: '' }, 'Escolha o produto do cadastro…'),
    ...(S.dados.produtos || []).map(p => el('option', { value: p.id, selected: p.id === c.sugestaoId ? true : null }, p.nome)), el('option', { value: 'NOVO', selected: !c.sugestaoId ? true : null }, 'É um produto novo (cadastrar)'));
  const nome = el('input', { type: 'text', value: c.nome, autocomplete: 'off' }), pa = el('input', { type: 'text', value: c.principio, placeholder: 'Princípio ativo', autocomplete: 'off' });
  const classe = el('select', {}, el('option', { value: '' }, 'Classe toxicológica (se tiver)'), ...(S.dados.classes || []).map(x => el('option', { value: x }, x)));
  const conc = el('input', { type: 'text', value: c.concentracao, placeholder: 'Concentração (ex.: 84 SC)', autocomplete: 'off' });
  const qtd = el('input', { type: 'number', inputmode: 'decimal', step: 'any', value: String(c.totalQtd) });
  const un = el('select', {}, ['L', 'ML', 'KG', 'G', 'UN'].map(u => el('option', { value: u, selected: u === c.totalUn ? true : null }, u)));
  const novo = el('div', {}, el('label', { class: 'rot' }, 'Nome do produto'), nome, el('label', { class: 'rot' }, 'Classe'), classe);
  const paBox = el('div', {}, el('label', { class: 'rot' }, exigePA ? (c.principio ? 'Princípio ativo' : 'Princípio ativo (a nota não traz: digite) *') : 'Princípio ativo (se tiver)'), pa);
  const escolhido = () => (S.dados.produtos || []).find(p => p.id === sel.value);
  // o princípio ativo aparece no produto novo e também quando o produto do cadastro está sem princípio ativo
  const atualiza = () => { const n = sel.value === 'NOVO'; novo.hidden = !n; paBox.hidden = !(n || (escolhido() && !escolhido().principio)); };
  sel.addEventListener('change', atualiza); atualiza();
  const confirmar = el('button', { type: 'button', class: 'btn' }, 'Confirmar que chegou');
  confirmar.onclick = async () => {
    const q = numero(qtd.value);
    if (!(q > 0)) return toast('Informe a quantidade que chegou.', 'erro');
    if (!diesel && !sel.value) return toast('Escolha o produto ou marque como produto novo.', 'erro');
    if (!diesel && sel.value === 'NOVO' && !nome.value.trim()) return toast('Escreva o nome do produto novo.', 'erro');
    if (!diesel && exigePA && !paBox.hidden && !pa.value.trim()) { pa.focus(); return toast('Digite o princípio ativo do produto (a nota não traz).', 'erro'); }
    confirmar.disabled = true;
    const ok = await enviarAprovacao(c, { decisao: 'aprovar', produtoId: diesel ? '' : sel.value, nome: nome.value.trim(), principio: pa.value.trim(), classe: classe.value, concentracao: conc.value.trim(), quantidade: String(q), unidade: un.value }, 'Chegada aprovada ✔ Entra no estoque quando enviar');
    if (ok) redesenhar(); else confirmar.disabled = false;
  };
  painel.append(...(diesel ? [] : [el('label', { class: 'rot' }, 'Produto no cadastro'), sel, novo, paBox, el('label', { class: 'rot' }, 'Concentração'), conc]),
    el('label', { class: 'rot' }, diesel ? 'Litros que chegaram' : 'Quanto chegou (total)'), el('div', { class: 'duplo' }, qtd, un), confirmar);
  const rapido = el('button', { type: 'button', class: 'btn' }, 'Chegou ✔');
  rapido.onclick = async () => {
    if (!pronto) { painel.hidden = false; if (exigePA && !paBox.hidden && !pa.value.trim()) pa.focus(); return toast(exigePA && !c.principio ? 'A nota não traz o princípio ativo: digite e confirme.' : 'Confira o produto e a quantidade e confirme.'); }
    rapido.disabled = true;
    const ok = await enviarAprovacao(c, { decisao: 'aprovar', produtoId: diesel ? '' : c.sugestaoId, nome: c.nome, principio: c.principio, concentracao: c.concentracao, quantidade: String(c.totalQtd), unidade: c.totalUn }, 'Chegada aprovada ✔ Entra no estoque quando enviar');
    if (ok) redesenhar(); else rapido.disabled = false;
  };
  const recusar = el('button', { type: 'button', class: 'btn sec' }, 'Não chegou');
  recusar.onclick = async () => { if (!confirm(`Marcar como NÃO chegou?\n\n${c.nome} (NF ${c.nf})`)) return; if (await enviarAprovacao(c, { decisao: 'ignorar' }, 'Marcado como não chegou')) redesenhar(); };
  return el('div', { class: 'cartao' },
    el('strong', {}, c.nome), el('span', { class: 'sub', style: 'display:block' }, diesel ? 'Diesel' : (c.principio ? `Princípio ativo: ${c.principio}` : (exigePA ? 'Princípio ativo: a nota não traz (será pedido ao aprovar)' : 'Sem princípio ativo na nota'))),
    el('span', { class: 'sub', style: 'display:block' }, `NF ${c.nf} · ${fmtData(c.emissao)}${c.concentracao ? ' · ' + c.concentracao : ''}`),
    el('span', { style: 'display:block;margin:6px 0;font-weight:700;color:var(--verde)' }, textoEmbalagem(c)),
    !diesel ? el('span', { class: 'sub', style: 'display:block' }, c.sugestaoId ? `No cadastro: ${c.sugestaoNome}${c.dicionario ? ' (já confirmado antes)' : ' (confira)'}` : 'Produto ainda não cadastrado') : null,
    c.lote ? el('span', { class: 'sub', style: 'display:block' }, `Lote ${c.lote}${c.validade ? ' · validade ' + c.validade : ''}`) : null,
    el('div', { class: 'duplo', style: 'margin-top:10px' }, rapido, el('button', { type: 'button', class: 'btn sec', onclick: () => { painel.hidden = !painel.hidden; } }, 'Ajustar…')),
    recusar, painel);
}
// lê o arquivo do DANFE View (acentos em Latin-1; se vier em UTF-8, lê de novo assim)
function lerArquivoTexto(f, cod) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsText(f, cod); }); }
async function importarRelatorioNfe(f, status, redesenhar) {
  try {
    let texto = await lerArquivoTexto(f, 'ISO-8859-1');
    if (/Ã[§£©ª³µ]/.test(texto)) texto = await lerArquivoTexto(f, 'UTF-8');
    status.textContent = 'Lendo o relatório…';
    const r = await api({ acao: 'nfe_importar', csv: texto, nome: f.name });
    if (!r.sucesso) throw new Error(r.erro || 'Não foi possível importar');
    S.dados.chegadas = await ajustarChegadasComFila(r.chegadas || []);
    try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
    const x = r.resumo;
    const msg = `Importado: ${x.novos} produto(s) novo(s) para aprovar · ${x.repetidos} já importado(s) · ${x.foraDoEstoque} item(ns) fora do estoque agrícola${x.cancelados ? ' · ' + x.cancelados + ' cancelado(s)' : ''}.`;
    toast(x.novos ? `${x.novos} produto(s) para aprovar ✔` : 'Nenhum produto novo neste relatório'); renderAlertaReceitas(); redesenhar(msg);
  } catch (e) { status.textContent = ''; toast(/fetch|Failed|network/i.test(e.message) ? 'Sem internet: importe de novo quando conectar.' : e.message, 'erro'); }
}
function renderChegou(root, msg) {
  root.replaceChildren();
  const lista = chegadas();
  root.append(el('h3', { class: 'secao' }, lista.length ? `Para aprovar (${lista.length})` : 'Para aprovar'));
  if (lista.length) lista.forEach(c => root.append(cartaoChegada(c, () => { renderChegou(root); renderAlertaReceitas(); })));
  else root.append(el('p', { class: 'sub' }, 'Nenhum produto esperando aprovação. Quando um relatório do DANFE View for importado, os produtos que chegaram aparecem aqui.'));
  const status = el('p', { class: 'sub' }, msg || '');
  const arq = el('input', { type: 'file', accept: '.csv,text/csv', hidden: true, onchange: ev => { const f = ev.target.files[0]; if (f) importarRelatorioNfe(f, status, m => renderChegou(root, m)); ev.target.value = ''; } });
  root.append(el('h3', { class: 'secao' }, 'Importar o relatório do DANFE View'),
    el('p', { class: 'sub' }, 'No DANFE View, exporte o relatório de documentos em CSV e escolha o arquivo aqui. Só entram defensivos, adubos, feromônios e diesel; o resto é ignorado.'),
    el('label', { class: 'btn sec', style: 'display:block;text-align:center;cursor:pointer' }, 'Escolher o arquivo do relatório (.csv)', arq), status);
  root.append(el('h3', { class: 'secao' }, 'Chegou sem relatório?'), el('p', { class: 'sub' }, 'Tire a foto da nota fiscal.'));
  const cx = el('div'); root.append(cx);
  montarForm(formNota(null), cx, () => { abrirEstoque('posicao'); });
}

/* =========================================================
   DIESEL: saldo do tanque, avisos (200 L amarelo, 100 L vermelho) e pedido pelo WhatsApp
   ========================================================= */
const DIESEL_AMARELO = 200, DIESEL_VERMELHO = 100, DIESEL_WHATSAPP = '5514997730252';   // (14) 99773-0252
const dieselVazio = () => ({ temBase: false, baseData: '', baseLitros: null, entradas: 0, saidas: 0, litros: 0 });
const nivelDiesel = d => (!d || !d.temBase) ? 'sem-base' : d.litros <= DIESEL_VERMELHO ? 'vermelho' : d.litros <= DIESEL_AMARELO ? 'amarelo' : 'ok';
const dieselEmAlerta = () => ['amarelo', 'vermelho'].includes(nivelDiesel(S.dados.diesel));
// aplica um movimento ao saldo (medição, chegada ou abastecimento). Só conta o que é depois do dia da medição, como no servidor.
function aplicaDiesel(d, tipo, v, data) {
  const l = numero(v); if (l == null) return d;
  if (tipo === 'medicao') Object.assign(d, { temBase: true, baseData: String(data), baseLitros: l, entradas: 0, saidas: 0, litros: l });
  else if (!d.temBase || String(data) > d.baseData) { if (tipo === 'entrada') { d.entradas += l; d.litros += l; } else { d.saidas += l; d.litros -= l; } }
  ['litros', 'entradas', 'saidas'].forEach(k => { d[k] = Math.round(d[k] * 10) / 10; });
  return d;
}
function ajustarDieselLocal(tipo, v, data) {
  S.dados.diesel = aplicaDiesel(S.dados.diesel || dieselVazio(), tipo, v, data);
  try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
  renderAlertaReceitas();
}
// o saldo do servidor mais o que está na fila do celular (abastecimentos, chegadas e medições ainda não enviados)
async function dieselComFila(d) {
  const c = d ? JSON.parse(JSON.stringify(d)) : dieselVazio();
  (await DB.todos()).forEach(i => {
    if (i.status === 'erro' || !i.payload) return;
    const m = i.payload.modulo, x = i.payload.dados || {};
    if (m === 'abastecimento') aplicaDiesel(c, 'saida', x.litros, x.data);
    else if (m === 'diesel') aplicaDiesel(c, 'entrada', x.litros, x.data);
    else if (m === 'diesel_medicao') aplicaDiesel(c, 'medicao', x.litros, x.data);
  });
  return c;
}
function linkDiesel(qtd) {
  const d = S.dados.diesel || dieselVazio(), n = numero(qtd);
  const linhas = ['Olá! Pedido de diesel para o Sítio Santa Izabel.', `Saldo atual no tanque: ${fmt(d.litros, 1)} litros (${fmtData(hoje())}).`, n > 0 ? `Quantidade desejada: ${fmt(n, 0)} litros.` : null, 'Obrigado!'].filter(Boolean);
  return `https://wa.me/${DIESEL_WHATSAPP}?text=${encodeURIComponent(linhas.join('\n'))}`;
}
function renderAlertaDiesel() {
  const box = $('#alerta-diesel'); if (!box) return;
  const n = nivelDiesel(S.dados.diesel);
  if (n !== 'amarelo' && n !== 'vermelho') { box.hidden = true; return; }
  const d = S.dados.diesel;
  box.hidden = false; box.className = 'alerta-rec ' + (n === 'vermelho' ? 'prio-0' : 'prio-2');
  box.replaceChildren(el('span', { class: 'alerta-txt' },
    el('b', {}, n === 'vermelho' ? `Diesel crítico: restam ${fmt(d.litros, 0)} L` : `Diesel baixo: restam ${fmt(d.litros, 0)} L`),
    el('small', {}, 'Toque para pedir diesel pelo WhatsApp')),
    el('span', { class: 'prio' }, n === 'vermelho' ? 'Crítico' : 'Atenção'));
}
function renderDiesel(root) {
  root.replaceChildren();
  const d = S.dados.diesel, n = nivelDiesel(d);
  if (n === 'sem-base') {
    root.append(el('div', { class: 'cartao' }, el('strong', {}, 'Ainda não há medição do tanque'),
      el('p', { class: 'sub' }, 'Para o saldo de diesel ficar certo, meça quanto há no tanque agora. A partir daí o app soma as chegadas e desconta os abastecimentos.'),
      el('button', { type: 'button', class: 'btn', onclick: () => { dieselMedindo = true; abrirEstoque('diesel'); } }, 'Medir o tanque agora')));
    root.append(el('p', { class: 'sub' }, `Sem a medição, os avisos de diesel baixo (${DIESEL_AMARELO} L amarelo e ${DIESEL_VERMELHO} L vermelho) ficam desligados.`));
    return;
  }
  const msg = { ok: `Diesel suficiente. O aviso amarelo começa em ${DIESEL_AMARELO} L e o vermelho em ${DIESEL_VERMELHO} L.`,
    amarelo: `Atenção: ${DIESEL_AMARELO} L ou menos no tanque. Hora de pedir diesel.`, vermelho: `Crítico: ${DIESEL_VERMELHO} L ou menos no tanque. Peça diesel agora.` }[n];
  root.append(el('div', { class: 'diesel-card nivel-' + n },
    el('div', { class: 'diesel-num' }, `${fmt(d.litros, 1)} L`), el('div', { class: 'diesel-msg' }, msg),
    el('small', {}, `Medido em ${fmtData(d.baseData)}: ${fmt(d.baseLitros, 1)} L · entraram ${fmt(d.entradas, 1)} L · saíram ${fmt(d.saidas, 1)} L`)));
  const qtd = el('input', { type: 'number', inputmode: 'decimal', min: '0', placeholder: 'Quantos litros pedir? (opcional)', autocomplete: 'off' });
  const zap = el('a', { class: 'btn zap', href: linkDiesel(''), target: '_blank', rel: 'noopener' }, 'Pedir diesel no WhatsApp');
  qtd.addEventListener('input', () => { zap.href = linkDiesel(qtd.value); });
  root.append(el('h3', { class: 'secao' }, 'Pedir diesel'), qtd, zap,
    el('p', { class: 'sub' }, 'O WhatsApp abre com a mensagem pronta para o (14) 99773-0252. Confira e envie.'));
  root.append(el('button', { type: 'button', class: 'btn sec', onclick: () => { dieselMedindo = true; abrirEstoque('diesel'); } }, 'Medir o tanque (acertar o saldo)'));
}

/* =========================================================
   LEITURA MENSAL DO HIDRÔMETRO: lembrete que aparece quando o mês vira e some quando as duas leituras são lançadas
   ========================================================= */
const ROTULO_HID = { A: 'A - Poço 1', B: 'B - Poço 2' };   // o que fica gravado na planilha continua sendo A e B
// null = nada a lembrar. Caso contrário: quais hidrômetros ainda não têm leitura NESTE mês.
function hidrometroPendente(hojeStr) {
  hojeStr = hojeStr || hoje();
  const mes = hojeStr.slice(0, 7), est = (S.dados.estado || {}).hidro || {};
  const faltam = ['A', 'B'].filter(h => !(est[h] && String(est[h].data).slice(0, 7) === mes));
  return faltam.length ? { mes, faltam } : null;
}
const moduloHidrometro = () => MODULOS.find(m => m.id === 'hidrometro');
function renderAlertaHidrometro() {
  const box = $('#alerta-hidrometro'); if (!box) return;
  const p = recebeAviso() ? hidrometroPendente() : null;
  if (!p) { box.hidden = true; const m = $('#aviso-hidrometro'); if (m && !m.hidden) { m.hidden = true; m.replaceChildren(); } return; }
  box.hidden = false; box.className = 'alerta-rec prio-1';
  box.replaceChildren(el('span', { class: 'alerta-txt' },
    el('b', {}, 'Lance a leitura do hidrômetro deste mês'),
    el('small', {}, `Falta: ${p.faltam.map(h => ROTULO_HID[h]).join(' e ')}`)),
    el('span', { class: 'prio' }, 'Do mês'));
}
// cartão de lembrete: uma vez por mês, na primeira vez que o app abre depois da virada do mês. Depois fica só a faixa no menu.
function verificarAvisoHidrometro() {
  const modal = $('#aviso-hidrometro');
  if (!modal || !modal.hidden || !S.codigo || S.tela === 'tela-acesso' || !recebeAviso() || !S.dadosFrescos) return;   // espera os dados do servidor: não cobra com informação velha
  const p = hidrometroPendente(); if (!p) return;
  if (localStorage.getItem('sitio_hidro_avisado') === p.mes) return;
  try { localStorage.setItem('sitio_hidro_avisado', p.mes); } catch (e) {}
  const fechar = () => { modal.hidden = true; modal.replaceChildren(); };
  modal.className = 'modal-rec prio-1';
  modal.replaceChildren(el('div', { class: 'cx' },
    el('span', { class: 'prio grande-prio' }, 'Do mês'),
    el('h2', {}, 'Leitura mensal do hidrômetro'),
    el('p', { class: 'cx-linha' }, el('b', {}, 'Começou um novo mês: lance as leituras.')),
    el('p', { class: 'cx-sub' }, `Falta lançar: ${p.faltam.map(h => ROTULO_HID[h]).join(' e ')}. A faixa de lembrete fica no menu até as leituras serem lançadas.`),
    el('button', { type: 'button', class: 'btn', onclick: () => { if (S.emFormulario && !confirm('Sair do lançamento atual? O que você digitou aqui será perdido.')) return; fechar(); abrirModulo(moduloHidrometro()); } }, 'Lançar a leitura agora'),
    el('button', { type: 'button', class: 'btn sec', onclick: fechar }, 'Depois')));
  modal.hidden = false; bip(); if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}

/* =========================================================
   LAVAGEM DA ROUPA (hidrorrepelente) depois de cada aplicação
   ========================================================= */
const lavagens = () => S.dados.lavagens || [];
const lavagemSel = V => lavagens().find(l => l.idExec === V.refExec);
const lavagensDe = aplicador => lavagens().filter(l => l.aplicador === aplicador);
const lavagensDoUsuario = () => lavagens().filter(l => S.nome && normTxt(l.aplicador).includes(normTxt(S.nome)));   // "Ocimar" casa com "OCIMAR DONIZETE ZANIBONI"
const rotuloLavagem = l => `${l.aplicador.split(' ')[0]} · ${String(l.aplicacao).toLowerCase()} · fim ${fmtData(l.data)} ${String(l.fim).slice(11, 16)} · ${l.talhoes.map(t => t.replace('TALHÃO ', 'T')).join(', ')}`;
const moduloHidrorep = () => MODULOS.find(m => m.id === 'hidrorepelente');

// pendência montada a partir de uma aplicação que ainda não saiu do celular (o servidor só a conhece depois do envio)
function lavagemDeEnvio(dados, idTransacao) {
  if (!dados || !dados.aplicador || !dados.tipoAplicacao || dados.tipoAplicacao === 'MANEJO OPERACIONAL') return null;
  const pares = [];
  Object.keys(dados.itens || {}).forEach(t => Object.keys((dados.itens[t] || {}).areas || {}).forEach(a => { const p = dados.itens[t].areas[a]; pares.push({ talhao: t, fim: p.fim || p.inicio }); }));
  if (!pares.length) return null;
  const ult = pares.reduce((m, p) => String(p.fim) > String(m.fim) ? p : m);
  return { idExec: 'local:' + idTransacao, aplicador: dados.aplicador, aplicacao: dados.tipoAplicacao, fim: ult.fim, data: String(ult.fim).slice(0, 10), talhao: ult.talhao, talhoes: [...new Set(pares.map(p => p.talhao))].sort() };
}
// a lista vem do servidor; o que está na fila do celular (aplicações e lavagens ainda não enviadas) é aplicado por cima
async function ajustarLavagensComFila(lista) {
  const fila = await DB.todos();
  fila.forEach(i => {
    if (i.status === 'erro' || !i.payload || i.payload.modulo !== 'aplicacao_execucao') return;
    const l = lavagemDeEnvio(i.payload.dados, i.payload.id_transacao);
    if (l && !lista.some(x => x.idExec === l.idExec)) lista.push(l);
  });
  fila.forEach(i => {
    if (i.status === 'erro' || !i.payload || i.payload.modulo !== 'hidrorepelente' || !i.payload.dados.refExec) return;
    const k = lista.findIndex(x => x.idExec === i.payload.dados.refExec); if (k >= 0) lista.splice(k, 1);
  });
  return lista;
}

function renderAlertaLavagem() {
  const box = $('#alerta-lavagem'); if (!box) return;
  const pend = recebeAviso() ? lavagensDoUsuario() : [];
  if (!pend.length) { box.hidden = true; return; }
  box.hidden = false;
  box.replaceChildren(el('span', { class: 'alerta-txt' },
    el('b', {}, pend.length > 1 ? `${pend.length} lavagens da roupa pendentes` : 'Lave a roupa e lance a lavagem'),
    el('small', {}, `${rotuloLavagem(pend[0])}. Sem isso, não dá para lançar outra aplicação.`)),
    el('span', { class: 'prio' }, 'Obrigatória'));
}
function lembrarLavagem(l) {
  const modal = $('#aviso-lavagem'); if (!modal || !l) return;
  const fechar = () => { modal.hidden = true; modal.replaceChildren(); };
  modal.className = 'modal-rec prio-0';
  modal.replaceChildren(el('div', { class: 'cx' },
    el('span', { class: 'prio grande-prio' }, 'Obrigatória'),
    el('h2', {}, 'Lembrete: lave a roupa'),
    el('p', { class: 'cx-linha' }, el('b', {}, `${l.aplicacao} terminada em ${fmtData(l.data)} às ${String(l.fim).slice(11, 16)}`)),
    el('p', { class: 'cx-sub' }, 'Lance a lavagem do hidrorrepelente com a data do fim da aplicação. Enquanto não lançar, o app não deixa começar outra aplicação.'),
    el('button', { type: 'button', class: 'btn', onclick: () => { fechar(); abrirModulo(moduloHidrorep()); } }, 'Lançar a lavagem agora'),
    el('button', { type: 'button', class: 'btn sec', onclick: fechar }, 'Depois')));
  modal.hidden = false; bip(); if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}
function mostrarBloqueioLavagem(l) {
  mostrar('tela-form'); S.tela = 'lavagem-bloqueio'; $('#form-titulo').textContent = 'Lavagem pendente'; $('#form-ultimos').hidden = true;
  $('#form-root').replaceChildren(
    el('div', { class: 'cartao erro' },
      el('strong', {}, 'Antes de uma nova aplicação, lance a lavagem da roupa'),
      el('p', {}, rotuloLavagem(l)),
      el('p', { class: 'sub' }, 'A lavagem do hidrorrepelente entra com a data do fim da última aplicação.'),
      el('button', { type: 'button', class: 'btn', onclick: () => abrirModulo(moduloHidrorep()) }, 'Lançar a lavagem agora')),
    el('button', { type: 'button', class: 'link', onclick: abrirAplicar }, '← Voltar às receitas'));
}
const classeAlertaModulo = m => ((m.id === 'estoque' && (dieselEmAlerta() || chegadas().length)) || (m.id === 'hidrometro' && recebeAviso() && hidrometroPendente()) || (m.id === 'aplicar' && recebeAviso() && (S.dados.receitas || []).length) || (m.id === 'hidrorepelente' && recebeAviso() && lavagensDoUsuario().length)) ? ' alerta' : '';

/* =========================================================
   RECEITA (técnico) E APLICAÇÃO (aplicador)
   ========================================================= */
const recebeAviso = () => S.perfil !== 'tecnico';   // o técnico lança as receitas: não precisa do aviso de "nova receita"
const receitasOrdenadas = () => [...(S.dados.receitas || [])].sort((a, b) => ORDEM_PRIO.indexOf(a.prioridade) - ORDEM_PRIO.indexOf(b.prioridade) || String(a.prazo).localeCompare(String(b.prazo)));
const receitasVistas = () => { try { return JSON.parse(localStorage.getItem('sitio_receitas_vistas')) || []; } catch (e) { return []; } };
const atrasada = r => String(r.prazo) < hoje();
function marcarReceitasVistas() { try { localStorage.setItem('sitio_receitas_vistas', JSON.stringify((S.dados.receitas || []).map(r => r.id))); } catch (e) {} renderAlertaReceitas(); }

// faixa no topo do menu: avisa que há receita e mostra a prioridade
function renderAlertaReceitas() {
  renderAlertaChegadas();
  renderAlertaDiesel();
  renderAlertaHidrometro();
  renderAlertaLavagem();
  const lista = receitasOrdenadas(), vistas = receitasVistas(), novas = lista.filter(r => !vistas.includes(r.id)), topo = lista[0];
  document.title = lista.length && recebeAviso() ? `(${lista.length}) Sítio Santa Izabel` : 'Sítio Santa Izabel';   // o número aparece até na aba do navegador
  if (!recebeAviso()) { const b = $('#alerta-receitas'), sn = $('#sino-receitas'); if (b) b.hidden = true; if (sn) sn.hidden = true; return; }

  const box = $('#alerta-receitas');
  if (box) {
    if (!lista.length) box.hidden = true;
    else {
      box.hidden = false; box.className = 'alerta-rec prio-' + Math.max(0, ORDEM_PRIO.indexOf(topo.prioridade));
      box.replaceChildren(
        el('span', { class: 'alerta-txt' },
          el('b', {}, novas.length ? (novas.length === 1 ? 'Nova receita para aplicar' : `${novas.length} novas receitas para aplicar`) : `${lista.length} ${lista.length === 1 ? 'receita' : 'receitas'} para aplicar`),
          el('small', {}, `${topo.aplicacao} · prazo ${fmtData(topo.prazo)}${atrasada(topo) ? ' (atrasada)' : ''}`)),
        el('span', { class: 'prio' }, rotuloPrio(topo.prioridade)));
    }
  }
  // sino flutuante: nas outras telas, enquanto houver receita aberta
  const sino = $('#sino-receitas');
  if (sino) {
    const mostrarSino = lista.length && S.codigo && !['tela-menu', 'tela-acesso', 'aplicar-lista', 'aplicar-receita', 'receitas-abertas'].includes(S.tela);
    sino.hidden = !mostrarSino;
    if (mostrarSino) { sino.className = 'sino prio-' + Math.max(0, ORDEM_PRIO.indexOf(topo.prioridade)); sino.textContent = `${lista.length} ${lista.length === 1 ? 'receita' : 'receitas'} · ${rotuloPrio(topo.prioridade)}`; }
  }
}
const marcaVista = id => { const v = receitasVistas(); if (!v.includes(id)) { v.push(id); try { localStorage.setItem('sitio_receitas_vistas', JSON.stringify(v)); } catch (e) {} } renderAlertaReceitas(); };

// som curto (sem arquivo de áudio) e vibração
function bip() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = new AC(), g = c.createGain(); g.connect(c.destination);
    [880, 1175].forEach((freq, i) => {
      const o = c.createOscillator(), t = c.currentTime + i * 0.28; o.type = 'sine'; o.frequency.value = freq; o.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t); o.stop(t + 0.26);
    });
  } catch (e) { /* sem som: o aviso na tela continua */ }
}

// cartão de aviso: aparece uma vez para cada receita nova, em qualquer tela, com o app aberto
const receitasAvisadas = () => { try { return JSON.parse(localStorage.getItem('sitio_receitas_avisadas')) || []; } catch (e) { return []; } };
function verificarAvisoReceitas() {
  const modal = $('#aviso-receita');
  if (!modal || !modal.hidden || !S.codigo || S.tela === 'tela-acesso' || !recebeAviso()) return;
  const avisadas = receitasAvisadas(), novas = receitasOrdenadas().filter(r => !avisadas.includes(r.id));
  if (!novas.length) return;
  const r = novas[0];
  try { localStorage.setItem('sitio_receitas_avisadas', JSON.stringify([...avisadas, ...novas.map(x => x.id)].slice(-200))); } catch (e) {}
  const talh = [...new Set(r.pendentes.map(p => p.talhao.replace('TALHÃO ', '')))].join(', ');
  const fechar = () => { modal.hidden = true; modal.replaceChildren(); };
  const abrir = () => {
    if (S.emFormulario && !confirm('Você está preenchendo outro lançamento. Sair dele e abrir a receita? O que você digitou aqui será perdido.')) return;
    fechar(); abrirReceita(r);
  };
  modal.className = 'modal-rec prio-' + Math.max(0, ORDEM_PRIO.indexOf(r.prioridade));
  modal.replaceChildren(el('div', { class: 'cx' },
    el('span', { class: 'prio grande-prio' }, rotuloPrio(r.prioridade)),
    el('h2', {}, novas.length > 1 ? `${novas.length} novas receitas para aplicar` : 'Nova receita para aplicar'),
    el('p', { class: 'cx-linha' }, el('b', {}, `${r.aplicacao}${r.tipo ? ' · ' + r.tipo : ''}`)),
    el('p', { class: 'cx-linha' }, `Talhão ${talh} · prazo ${fmtData(r.prazo)}${atrasada(r) ? ' (atrasada)' : ''}`),
    r.justificativa ? el('p', { class: 'cx-sub' }, r.justificativa) : null,
    novas.length > 1 ? el('p', { class: 'cx-sub' }, `Esta é a mais urgente. Há mais ${novas.length - 1} aguardando.`) : null,
    el('button', { type: 'button', class: 'btn', onclick: abrir }, 'Abrir receita'),
    novas.length > 1 ? el('button', { type: 'button', class: 'btn sec', onclick: () => { if (S.emFormulario && !confirm('Sair do lançamento atual? O que você digitou aqui será perdido.')) return; fechar(); abrirAplicar(); } }, 'Ver todas as receitas') : null,
    el('button', { type: 'button', class: 'btn sec', onclick: fechar }, 'Depois')));
  modal.hidden = false;
  bip(); if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
}

// tira da lista os talhões/áreas que este aparelho já aplicou mas ainda não enviou
function descontarPares(lista, dados) {
  const rec = (lista || []).find(x => x.id === dados.idReceita); if (!rec) return;
  Object.keys(dados.itens || {}).forEach(t => Object.keys((dados.itens[t] || {}).areas || {}).forEach(a => {
    rec.pendentes = rec.pendentes.filter(p => !(p.talhao === t && p.area === a));
  }));
  if (!rec.pendentes.length) lista.splice(lista.indexOf(rec), 1);
}
async function descontarFilaReceitas(lista) {
  (await DB.todos()).forEach(i => {
    if (!i.payload) return;
    if (i.payload.modulo === 'aplicacao_execucao') descontarPares(lista, i.payload.dados);
    else if (i.payload.modulo === 'receita_cancelar') aplicarCancelamentoLocal(lista, i.payload.dados);
  });
}

let receitasAnteriores = null;
async function atualizarReceitas() {
  if (!navigator.onLine || !S.codigo) return;
  try {
    const r = await apiGet({ acao: 'receitas' });
    if (r.codigo === 'AUTH') { pedirAcesso('Seu acesso foi encerrado ou o código mudou. Digite o código novo.'); return; }
    if (!r.sucesso) return;
    const lista = r.receitas || [];
    await descontarFilaReceitas(lista);
    if (Array.isArray(r.lavagens)) S.dados.lavagens = await ajustarLavagensComFila(r.lavagens.slice());
    if (r.diesel) S.dados.diesel = await dieselComFila(r.diesel);
    if (Array.isArray(r.chegadas)) S.dados.chegadas = await ajustarChegadasComFila(r.chegadas.slice());
    if (r.hidro) {   // mantém a leitura mais nova (a de outro celular ou a que ainda está na fila deste)
      const est = S.dados.estado = S.dados.estado || {}; est.hidro = est.hidro || {};
      Object.keys(r.hidro).forEach(h => { if (!est.hidro[h] || String(r.hidro[h].data) >= String(est.hidro[h].data)) est.hidro[h] = r.hidro[h]; });
      S.dadosFrescos = true;
    }
    const antes = receitasAnteriores; receitasAnteriores = lista.map(x => x.id);
    S.dados.receitas = lista;
    try { localStorage.setItem('sitio_dados', JSON.stringify(S.dados)); } catch (e) {}
    if (!$('#tela-menu').hidden) montarMenu(); else renderAlertaReceitas();
    if (document.visibilityState === 'visible') { verificarAvisoReceitas(); verificarAvisoHidrometro(); }
  } catch (e) { /* sem sinal: mantém a lista guardada */ }
}


// ---- o técnico acompanha e cancela receitas ----
function aplicarCancelamentoLocal(lista, dados) {
  const i = (lista || []).findIndex(x => x.id === dados.idReceita); if (i < 0) return;
  if (!dados.talhao) { lista.splice(i, 1); return; }
  lista[i].pendentes = lista[i].pendentes.filter(p => p.talhao !== dados.talhao);
  if (!lista[i].pendentes.length) lista.splice(i, 1);
}
function abrirReceitasAbertas() {
  mostrar('tela-form'); S.tela = 'receitas-abertas'; $('#form-titulo').textContent = 'Receitas em aberto'; $('#form-ultimos').hidden = true;
  const root = $('#form-root'); root.replaceChildren();
  const lista = receitasOrdenadas();
  if (!lista.length) { root.append(el('p', { class: 'sub' }, 'Nenhuma receita em aberto. Todas foram aplicadas ou canceladas.')); return; }
  root.append(el('p', { class: 'sub' }, 'Receitas que ainda têm talhão para aplicar. Você pode cancelar a receita inteira ou só um talhão: o aplicador deixa de ver o que foi cancelado.'));
  lista.forEach(r => root.append(cartaoCancelavel(r)));
}
function cartaoCancelavel(r) {
  const porTalhao = {}; r.pendentes.forEach(p => (porTalhao[p.talhao] = porTalhao[p.talhao] || []).push(p.area));
  const talhoes = Object.keys(porTalhao).sort();
  const escopo = el('select', {}, el('option', { value: '' }, 'A receita inteira'), ...talhoes.map(t => el('option', { value: t }, `Só o ${t}`)));
  const motivo = el('textarea', { rows: '2', placeholder: 'Motivo do cancelamento (obrigatório)' });
  const confirmar = el('button', { type: 'button', class: 'btn perigo' }, 'Confirmar cancelamento');
  const painel = el('div', { class: 'painel-prod', hidden: true, style: 'width:100%' },
    el('label', { class: 'rot' }, 'O que cancelar'), escopo, el('label', { class: 'rot' }, 'Motivo'), motivo, confirmar);
  confirmar.onclick = async () => {
    const m = motivo.value.trim();
    if (m.length < 3) return toast('Escreva o motivo do cancelamento.', 'erro');
    const alvo = escopo.value ? `só o ${escopo.value}` : 'a receita inteira';
    if (!confirm(`Cancelar ${alvo} (${r.id})?\n\nMotivo: ${m}\n\nO aplicador deixa de ver o que for cancelado.`)) return;
    confirmar.disabled = true;
    const id = uid();
    const payload = { acao: 'salvar', modulo: 'receita_cancelar', id_transacao: id, dados: { idReceita: r.id, talhao: escopo.value, motivo: m }, novasListas: [] };
    if (!(await guardar({ id_transacao: id, payload, criado: Date.now(), titulo: 'Cancelamento ' + r.id }))) { confirmar.disabled = false; return; }
    aplicarCancelamentoLocal(S.dados.receitas, payload.dados);
    toast('Cancelamento guardado ✔ Envia sozinho quando tiver internet'); sincronizar();
    abrirReceitasAbertas(); renderAlertaReceitas();
  };
  return el('div', { class: 'cartao-rec prio-' + Math.max(0, ORDEM_PRIO.indexOf(r.prioridade)), style: 'cursor:default' },
    el('span', { class: 'prio' }, rotuloPrio(r.prioridade)),
    el('strong', {}, `${r.aplicacao}${r.tipo ? ' · ' + r.tipo : ''}`),
    el('span', { class: 'sub' }, `Falta aplicar: ${talhoes.map(t => `${t} (${porTalhao[t].sort().join(', ')})`).join(' · ')}`),
    el('span', { class: 'sub' }, `Prazo ${fmtData(r.prazo)}${atrasada(r) ? ' (atrasada)' : ''} · ${r.id}`),
    el('button', { type: 'button', class: 'btn sec', style: 'margin-top:8px', onclick: () => { painel.hidden = !painel.hidden; } }, 'Cancelar…'),
    painel);
}

// ---- tela do aplicador ----
function abrirAplicar() {
  mostrar('tela-form'); S.tela = 'aplicar-lista'; $('#form-titulo').textContent = 'Aplicação (receitas)'; $('#form-ultimos').hidden = true;
  marcarReceitasVistas();
  const root = $('#form-root'); root.replaceChildren();
  const lista = receitasOrdenadas();
  if (!lista.length) { root.append(el('p', { class: 'sub' }, 'Nenhuma receita para aplicar agora. Quando o técnico lançar uma, ela aparece aqui e o aviso surge no menu.')); return; }
  if (lavagensDoUsuario().length) root.append(el('div', { class: 'cartao erro' }, el('strong', {}, 'Lavagem da roupa pendente'), el('p', {}, rotuloLavagem(lavagensDoUsuario()[0])),
    el('button', { type: 'button', class: 'btn', onclick: () => abrirModulo(moduloHidrorep()) }, 'Lançar a lavagem agora')));
  root.append(el('p', { class: 'sub' }, 'Toque na receita que você vai aplicar. As mais urgentes ficam no topo.'));
  lista.forEach(r => {
    const talh = [...new Set(r.pendentes.map(p => p.talhao.replace('TALHÃO ', '')))].join(', ');
    root.append(el('button', { type: 'button', class: 'cartao-rec prio-' + Math.max(0, ORDEM_PRIO.indexOf(r.prioridade)), onclick: () => abrirReceita(r) },
      el('span', { class: 'prio' }, rotuloPrio(r.prioridade)),
      el('strong', {}, `${r.aplicacao}${r.tipo ? ' · ' + r.tipo : ''}`),
      el('span', { class: 'sub' }, `Talhão ${talh} · prazo ${fmtData(r.prazo)}${atrasada(r) ? ' (atrasada)' : ''}`),
      el('span', { class: 'sub' }, r.id)));
  });
}
function abrirReceita(r) {
  if (r.aplicacao !== 'MANEJO OPERACIONAL' && lavagensDoUsuario().length) return mostrarBloqueioLavagem(lavagensDoUsuario()[0]);   // lavar a roupa antes de nova aplicação
  mostrar('tela-form'); S.tela = 'aplicar-receita'; $('#form-ultimos').hidden = true;
  marcaVista(r.id);
  const root = $('#form-root'); $('#form-titulo').textContent = r.id;
  montarForm(moduloAplicar(r), root, () => irMenu());
  root.prepend(el('button', { type: 'button', class: 'link', onclick: abrirAplicar }, '← Voltar às receitas'));
}

const normTxt = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// produto "da mesma família": mesmo princípio ativo e mesma concentração. O que está no estoque aparece com o saldo.
function equivalentes(p) {
  const pa = normTxt(p.principio), conc = normTxt(p.concentracao);
  const saldo = {}; (S.dados.estoque || []).forEach(e => { saldo[e.id] = e; });
  const lista = [{ v: p.id, l: `${p.nome} (o da receita)` }];
  (S.dados.produtos || []).forEach(c => {
    if (c.id !== p.id && pa && conc && normTxt(c.principio) === pa && normTxt(c.concentracao) === conc) {
      const e = saldo[c.id];
      lista.push({ v: c.id, l: `${c.nome} (equivalente${e ? ` · estoque ${fmt(e.saldo)} ${e.un}` : ''})` });
    }
  });
  return lista;
}
const totalTxt = (v, un) => { un = String(un).toUpperCase(); if (un === 'ML' && v >= 1000) return `${fmt(v / 1000, 3)} L`; if (un === 'G' && v >= 1000) return `${fmt(v / 1000, 3)} KG`; return `${fmt(v, 3)} ${un}`; };
const doseTxt = p => p.porTalhao ? `${Object.keys(p.porTalhao).sort().map(t => `${t.replace('TALHÃO ', 'T')}: ${fmt(p.porTalhao[t].dose, 3)} ${p.unidade}`).join(' · ')} (dose por planta: ${fmt(p.dosePlanta, 3)} ${p.unidade})` : p.pes ? `${fmt(p.dose, 3)} ${p.unidade} por talhão (${fmt(p.pes)} pés × ${fmt(p.dosePlanta, 3)})` : `${fmt(p.dose, 3)} ${p.unidade}`;
function resumoReceita(r) {
  const linhas = [`${r.aplicacao}${r.tipo ? ' · ' + r.tipo : ''}  |  ${rotuloPrio(r.prioridade)}  |  prazo ${fmtData(r.prazo)}${atrasada(r) ? ' (atrasada)' : ''}`,
    `Justificativa: ${r.justificativa}`, `Método: ${r.metodo}${r.volume ? ' · calda ' + r.volume : ''}${r.ph ? ' · pH ' + r.ph : ''}${r.vazao ? ' · vazão ' + r.vazao + (/^n/i.test(r.vazao) ? '' : ' L/ha') : ''}`];
  if (r.carencia) linhas.push(`Carência: ${r.carencia} · Reentrada: ${r.reentrada || '24 Horas'}`);
  if (r.aplicacao === 'MANEJO OPERACIONAL' && r.dataRealizacao) linhas.push(`Realizar em: ${fmtData(r.dataRealizacao)} ${String(r.dataRealizacao).slice(11, 16)}`);
  const vistos = new Set();
  r.talhoes.forEach(t => { if (r.pendentes.some(p => p.talhao === t.talhao) && !vistos.has(t.talhao)) { vistos.add(t.talhao); linhas.push(`${t.talhao}: ${t.avaliacao}${t.fase ? ' (' + t.fase + ')' : ''}`); } });
  return linhas.join('\n');
}

// monta o formulário do aplicador para uma receita
function moduloAplicar(r) {
  const manejo = r.aplicacao === 'MANEJO OPERACIONAL';
  const bombas = !manejo && r.aplicacao !== 'ADUBAÇÃO';   // a dose da receita é por bomba; adubação baixa a dose por talhão
  const talhoes = [...new Set(r.pendentes.map(p => p.talhao))];
  const areasDe = t => r.pendentes.filter(p => p.talhao === t).map(p => p.area);
  const campos = [
    { k: 'idReceita', t: 'text', l: 'Receita', def: r.id, ro: true, showIf: () => false },
    { k: 'tipoAplicacao', t: 'text', l: 'Aplicação', def: r.aplicacao, ro: true, showIf: () => false },
    { t: 'secao', l: r.id },
    { t: 'info', show: () => resumoReceita(r) }
  ];
  if (!manejo) {
    campos.push({ t: 'secao', l: '1. Confirme os produtos' });
    r.produtos.forEach((p, i) => campos.push(
      { t: 'info', show: () => `Produto ${i + 1} da receita: ${p.nome}\nPrincípio ativo: ${p.principio || '-'} · Concentração: ${p.concentracao}\nDose: ${doseTxt(p)}${p.pes || p.porTalhao ? '' : ' por bomba'}` },
      { k: 'prod' + i, t: 'select', l: `Produto usado (${i + 1})`, def: p.id, opts: () => equivalentes(p) }));
  }
  campos.push({ t: 'secao', l: manejo ? 'Onde foi feito' : '2. Onde foi aplicado' },
    { k: 'itens', t: 'multi', l: 'Talhões (marque os que você aplicou)', opts: talhoes, subTitle: v => v, sub: [
      { k: 'areas', t: 'multi', l: 'Áreas deste talhão', opts: st => areasDe(st.__opt), subTitle: v => 'Área ' + v,
        sub: manejo ? [{ k: 'inicio', t: 'datetime', l: 'Data e hora da realização', now: true }]
                    : [{ k: 'inicio', t: 'datetime', l: 'Início', now: true }, { k: 'fim', t: 'datetime', l: 'Fim', now: true },
                       ...(bombas ? [
                         { k: 'bombas', t: 'number', l: 'Bombas aplicadas', positivo: true },
                         { t: 'info', show: (V, st) => { const b = numero(st.bombas); return b > 0 ? 'Baixa no estoque:\n' + r.produtos.map(p => `${p.nome}: ${fmt(p.dose, 3)} ${p.unidade} × ${fmt(b, 3)} bombas = ${totalTxt(p.dose * b, p.unidade)}`).join('\n') : ''; } }
                       ] : [])] }
    ] });
  if (!manejo) campos.push(
    { t: 'secao', l: '3. Máquina' },
    { k: 'trator', t: 'select', l: 'Trator', outro: true, opts: TRATORES },
    { k: 'marcha', t: 'text', l: 'Marcha', def: '2° Reduzida', ro: true }, { k: 'rpm', t: 'number', l: 'RPM', def: '2200', ro: true },
    { k: 'implemento', t: 'text', l: 'Implemento', def: 'Jacto 4000l', ro: true },
    { k: 'pressao', t: 'text', l: 'Pressão', def: '200lb', ro: true }, { k: 'bico', t: 'text', l: 'Bico', def: '5 difusor 3 e 2', ro: true },
    { t: 'secao', l: '4. Condições' },
    { k: 'condicoes', t: 'select', l: 'Condições meteorológicas', opts: ['Chuvoso', 'Ensolarado', 'Úmido', 'Condições Normais'] },
    { k: 'vento', t: 'select', l: 'Velocidade do vento', opts: ['Forte', 'Fraco'] },
    { t: 'secao', l: '5. Segurança' },
    { k: 'epi', t: 'textarea', l: 'EPI', def: EPI_TXT },
    { k: 'descarte', t: 'textarea', l: 'Cuidados com o descarte', def: DESCARTE_TXT },
    { k: 'sobra', t: 'text', l: 'Sobra de calda', def: 'Não', ro: true });
  campos.push({ t: 'secao', l: 'Fechamento' },
    { k: 'aplicador', t: 'select', l: 'Aplicador', opts: RESP },
    { k: 'assinatura', t: 'assinatura', l: 'Assinatura do aplicador' });
  return { id: 'aplicacao_execucao', nome: 'Aplicação ' + r.id, campos,
    // quem tem lavagem da roupa pendente não lança outra aplicação
    validar: V => { if (manejo) return null; const p = lavagensDe(V.aplicador); return p.length ? `${V.aplicador.split(' ')[0]} tem lavagem da roupa pendente (${rotuloLavagem(p[0])}). Lance a lavagem no Hidrorrepelente antes de uma nova aplicação.` : null; },
    aoSalvar: (V, idTransacao) => {
      descontarPares(S.dados.receitas, V);
      const l = manejo ? null : lavagemDeEnvio(V, idTransacao);   // a lavagem passa a ser obrigatória
      if (l) { S.dados.lavagens = [...lavagens().filter(x => x.idExec !== l.idExec), l]; setTimeout(() => lembrarLavagem(l), 600); }
      renderAlertaReceitas();
    } };
}

/* ---------- estoque ---------- */
let abaEstoque = 'posicao', produtoEntrada = null, dieselMedindo = false;
function abrirEstoque(aba) {
  if (aba) abaEstoque = aba;
  mostrar('tela-estoque');
  const abas = $('#estoque-abas'); abas.replaceChildren();
  [['posicao', 'Posição'], ['resumo', 'Resumo'], ['entrada', 'Chegou produto'], ['diesel', 'Diesel'], ['caixas', 'Caixas']].forEach(([id, nome]) =>
    abas.append(el('button', { class: id === abaEstoque ? 'on' : '', onclick: () => { produtoEntrada = null; dieselMedindo = false; abrirEstoque(id); } }, nome)));
  const root = $('#estoque-root');
  if (abaEstoque === 'entrada') { if (produtoEntrada) montarForm(formNota(produtoEntrada), root, () => { produtoEntrada = null; abrirEstoque('posicao'); }); else renderChegou(root); }
  else if (abaEstoque === 'diesel') { if (dieselMedindo) montarForm(FORM_MEDICAO_DIESEL, root, () => { dieselMedindo = false; abrirEstoque('diesel'); }); else renderDiesel(root); }
  else if (abaEstoque === 'caixas') renderCaixas(root);
  else if (abaEstoque === 'resumo') renderResumo(root);
  else renderPosicao(root);
}

// unidades: tudo é comparado na unidade-base (mL, g, un). Estoque em L e uso em mL se compensam.
const FATOR_UN = { L: 1000, ML: 1, KG: 1000, G: 1, UN: 1 }, GRUPO_UN = { L: 'vol', ML: 'vol', KG: 'mass', G: 'mass', UN: 'un' };
const paraBaseJS = (q, u) => ({ v: q * (FATOR_UN[String(u).toUpperCase()] || 1), g: GRUPO_UN[String(u).toUpperCase()] || String(u).toLowerCase() });
function exibirBaseJS(v, g) {
  g = String(g).toLowerCase();
  if (g === 'vol') return Math.abs(v) >= 1000 ? { q: v / 1000, un: 'L' } : { q: v, un: 'ML' };
  if (g === 'mass') return Math.abs(v) >= 1000 ? { q: v / 1000, un: 'KG' } : { q: v, un: 'G' };
  return { q: v, un: 'UN' };
}
const qtdTxt = (v, g) => { const e = exibirBaseJS(v, g); return `${fmt(e.q)} ${e.un}`; };
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = ym => { const [a, m] = String(ym).split('-'); return `${NOMES_MES[+m - 1]} de ${a}`; };

let subCaixas = null;
function renderCaixas(root) {
  root.replaceChildren();
  const voltar = () => { subCaixas = null; abrirEstoque('caixas'); };
  if (subCaixas) {
    montarForm(subCaixas === 'retorno' ? FORM_CX_RETORNO : FORM_CX_CONTAGEM, root, voltar);
    root.prepend(el('button', { type: 'button', class: 'link', onclick: voltar }, '← Voltar para as caixas'));
    return;
  }
  const c = S.dados.caixas;
  if (!c) { root.append(el('p', { class: 'sub' }, 'O controle de caixas ainda não está disponível. Abra o app com internet para carregar.')); return; }
  root.append(el('div', { class: 'cartao' + (c.naFazenda < 0 ? ' erro' : '') },
    el('span', { class: 'sub' }, 'Caixas na fazenda agora'), el('div', { class: 'grande' + (c.naFazenda < 0 ? ' neg' : '') }, String(c.naFazenda)),
    el('span', { class: 'sub' }, c.temContagem ? `Última contagem: ${fmtData(c.contagemData)} (${c.contagemQtd} caixas)` : 'Ainda não houve contagem. Conte as caixas e lance a contagem para o saldo ficar certo.')));
  root.append(el('button', { type: 'button', class: 'btn', onclick: () => { subCaixas = 'retorno'; abrirEstoque('caixas'); } }, 'Lançar retorno de caixas'));
  root.append(el('button', { type: 'button', class: 'btn sec', onclick: () => { subCaixas = 'contagem'; abrirEstoque('caixas'); } }, 'Contar as caixas da fazenda'));

  root.append(el('h3', { class: 'secao' }, 'Em poder dos clientes'));
  if (!c.porDestino.length) root.append(el('p', { class: 'sub' }, 'Nenhuma caixa saiu ainda.'));
  c.porDestino.forEach(o => root.append(el('div', { class: 'item' },
    el('div', {}, o.destino || '(sem destino)', el('span', { class: 'sub' }, `Saíram ${o.saiu} · voltaram ${o.voltou}`)),
    el('span', { class: 'val' + (o.falta > 0 ? ' neg' : '') }, o.falta > 0 ? `faltam ${o.falta}` : o.falta < 0 ? `voltaram ${-o.falta} a mais` : 'em dia'))));

  if ((c.movimentos || []).length) {
    root.append(el('h3', { class: 'secao' }, 'Últimos movimentos'));
    c.movimentos.slice(0, 12).forEach(m => root.append(el('div', { class: 'item' },
      el('div', {}, `${m.tipo === 'SAÍDA' ? 'Saída' : m.tipo === 'RETORNO' ? 'Retorno' : 'Contagem'}${m.destino ? ' · ' + m.destino : ''}`, el('span', { class: 'sub' }, fmtData(m.data))),
      el('span', { class: 'val' }, (m.tipo === 'SAÍDA' ? '− ' : m.tipo === 'RETORNO' ? '+ ' : '= ') + m.qtd))));
  }
}

function renderPosicao(root) {
  root.replaceChildren();
  const sem = S.dados.entradasSemNota || [];
  if (sem.length) {
    root.append(el('h3', { class: 'secao' }, 'Entradas sem foto da nota'));
    sem.forEach(e => root.append(el('div', { class: 'cartao' },
      el('strong', {}, e.produto), el('span', { class: 'sub', style: 'display:block' }, `${fmt(Number(e.qtd))} ${e.un} · ${fmtData(e.data)}`),
      el('label', { class: 'btn-foto sec', style: 'margin-top:10px' }, ico('camera'), 'Anexar foto da nota',
        el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: async ev => {
          const arq = ev.target.files[0]; if (!arq) return;
          const id = uid(), foto = await comprimir(arq);
          if (!(await guardar({ id_transacao: id, payload: { acao: 'estoque_anexar_nota', id_transacao: id, id_entrada: e.id, foto }, criado: Date.now(), titulo: 'Nota de ' + e.produto }))) return;
          S.dados.entradasSemNota = sem.filter(x => x.id !== e.id); toast('Foto guardada ✔'); renderPosicao(root); sincronizar();
        } })))));
  }
  root.append(el('h3', { class: 'secao' }, 'Produtos em estoque'));
  root.append(el('p', { class: 'sub' }, 'Toque em um produto para conferir a quantidade (contagem) ou dar entrada quando chegar mais.'));
  const busca = el('input', { type: 'search', placeholder: 'Buscar produto…', autocomplete: 'off' });
  const lista = el('div');
  root.append(busca, lista);
  let aberto = null;   // chave do produto aberto (código ou nome): os objetos da lista são trocados quando os dados atualizam
  const chave = p => String(p.id || p.nome);
  const desenhar = () => {
    const q = busca.value.trim().toLowerCase();
    const itens = (S.dados.estoque || []).filter(p => p.nome.toLowerCase().includes(q));
    lista.replaceChildren(...(itens.length ? itens.map(p => {
      const cab = el('button', { type: 'button', class: 'prod-cab', 'aria-expanded': String(aberto === chave(p)), onclick: () => { aberto = aberto === chave(p) ? null : chave(p); desenhar(); } },
        el('div', {}, el('strong', {}, p.nome), el('span', { class: 'sub' }, p.contagem ? `Última contagem: ${p.contagem}` : 'Nunca foi contado')),
        el('span', { class: 'val' + (p.negativo ? ' neg' : '') }, `${fmt(p.saldo)} ${p.un}`));
      const card = el('div', { class: 'cartao-prod' + (aberto === chave(p) ? ' aberto' : '') }, cab);
      if (aberto === chave(p)) card.append(painelProduto(p, desenhar));
      return card;
    }) : [el('p', { class: 'sub' }, 'Nenhum produto encontrado.')]));
  };
  busca.addEventListener('input', desenhar); desenhar();
  root.append(el('p', { class: 'sub' }, 'Saldo = última contagem + entradas − o que foi usado desde então. Em vermelho: usou-se mais do que entrou; falta registrar uma entrada ou fazer a contagem.'));
  root.append(el('button', { type: 'button', class: 'btn sec', onclick: () => pedirRelatorio(new Date().toISOString().slice(0, 7)) }, 'Gerar relatório deste mês (Word)'));
}

function painelProduto(p, redesenhar) {
  const painel = el('div', { class: 'painel-prod' });
  if (p.negativo) painel.append(el('div', { class: 'dica aviso' }, '⚠ Foi usado mais do que o registrado como estoque. Faça a contagem abaixo para acertar o saldo.'));
  if (p.conflito) painel.append(el('div', { class: 'dica aviso' }, '⚠ Este produto tem registros em unidades diferentes (por exemplo, L e KG). O saldo pode estar errado: conte de novo.'));
  if (!p.id) { painel.append(el('div', { class: 'dica' }, 'Este produto não está no cadastro, então não dá para contar por aqui.')); return painel; }

  painel.append(el('div', { class: 'dica' }, `No sistema: ${fmt(p.saldo)} ${p.un}`));
  const qtd = el('input', { type: 'number', inputmode: 'decimal', step: 'any', min: '0', placeholder: 'Quanto tem agora?', autocomplete: 'off' });
  const un = el('select', {}, UNID.map(u => el('option', { value: u, selected: u === p.un ? true : null }, u)));
  const resultado = el('div', { class: 'dica', hidden: true });
  const comparar = () => {
    const q = numero(qtd.value); resultado.hidden = q == null;
    if (q == null) return null;
    const cont = paraBaseJS(q, un.value), sis = paraBaseJS(p.saldo, p.un);
    if (cont.g !== sis.g && p.saldo !== 0) { resultado.textContent = `⚠ Unidade diferente do sistema (${p.un}). A contagem vai valer na unidade que você escolheu.`; resultado.classList.add('aviso'); return { q, dif: null }; }
    const dif = (cont.v - sis.v) / (FATOR_UN[un.value] || 1);
    resultado.classList.toggle('aviso', Math.abs(dif) > 1e-9);
    resultado.textContent = Math.abs(dif) < 1e-9 ? 'Confere com o sistema.' : `Diferença: ${dif > 0 ? '+' : '−'}${fmt(Math.abs(dif))} ${un.value} em relação ao sistema.`;
    return { q, dif };
  };
  qtd.addEventListener('input', comparar); un.addEventListener('change', comparar);
  painel.append(el('label', { class: 'rot' }, 'Contagem: quanto tem agora'), el('div', { class: 'duplo' }, qtd, un), resultado);

  const confirmar = el('button', { type: 'button', class: 'btn', style: 'margin-top:12px' }, 'Confirmar contagem');
  confirmar.onclick = async () => {
    const r = comparar(); if (!r || r.q < 0) return toast('Digite quanto tem em estoque.', 'erro');
    const dif = r.dif == null ? '' : (Math.abs(r.dif) < 1e-9 ? 'Confere com o sistema.' : `Diferença: ${r.dif > 0 ? '+' : '−'}${fmt(Math.abs(r.dif))} ${un.value}.`);
    if (!confirm(`Confirmar a contagem de ${p.nome}?\n\nContado: ${fmt(r.q)} ${un.value}\nNo sistema: ${fmt(p.saldo)} ${p.un}\n${dif}\n\nA partir de agora este passa a ser o estoque.`)) return;
    confirmar.disabled = true;
    const id = uid();
    const payload = { acao: 'salvar', modulo: 'estoque_contagem', id_transacao: id, dados: { data: hoje(), produtoId: p.id, qtd: String(r.q), unidade: un.value }, novasListas: [] };
    if (!(await guardar({ id_transacao: id, payload, criado: Date.now(), titulo: 'Contagem de ' + p.nome }))) { confirmar.disabled = false; return; }
    const b = paraBaseJS(r.q, un.value), e = exibirBaseJS(b.v, b.g);
    p.saldo = Math.round(e.q * 100) / 100; p.un = e.un; p.contagem = fmtData(hoje()); p.negativo = false; p.conflito = false; p.mov = true;
    toast('Contagem guardada ✔ Envia sozinha quando tiver internet'); redesenhar(); sincronizar();
  };
  painel.append(confirmar);
  painel.append(el('button', { type: 'button', class: 'btn sec', onclick: () => { produtoEntrada = p; abrirEstoque('entrada'); } }, 'Chegou mais (foto da nota)'));
  return painel;
}

// Resumo do mês: o que foi usado em cada talhão
let mesResumo = null;
function renderResumo(root) {
  root.replaceChildren();
  const uso = S.dados.usoMensal || [], atual = new Date().toISOString().slice(0, 7);
  const meses = [...new Set([atual, ...uso.map(u => u.mes)])].sort().reverse();
  if (!mesResumo || !meses.includes(mesResumo)) mesResumo = meses[0];
  const sel = el('select', { onchange: e => { mesResumo = e.target.value; renderResumo(root); } },
    meses.map(m => el('option', { value: m, selected: m === mesResumo ? true : null }, nomeMes(m))));
  root.append(el('div', { class: 'campo' }, el('label', { class: 'rot' }, 'Mês'), sel));

  const doMes = uso.filter(u => u.mes === mesResumo);
  if (!doMes.length) root.append(el('p', { class: 'sub' }, 'Nenhum uso de produto registrado neste mês.'));
  else {
    const porTalhao = {};
    doMes.forEach(u => (porTalhao[u.talhao] = porTalhao[u.talhao] || []).push(u));
    root.append(el('h3', { class: 'secao' }, 'Usado em cada talhão'));
    Object.keys(porTalhao).sort().forEach(t => root.append(el('div', { class: 'cartao' }, el('strong', {}, t),
      porTalhao[t].sort((a, b) => a.produto.localeCompare(b.produto)).map(u => el('div', { class: 'item' },
        el('div', {}, u.produto, el('span', { class: 'sub' }, `${u.n} ${u.n === 1 ? 'uso' : 'usos'}`)), el('span', { class: 'val' }, qtdTxt(u.v, u.g)))))));
    const tot = {};
    doMes.forEach(u => { const k = u.produto.toUpperCase(); const o = tot[k] || (tot[k] = { produto: u.produto, v: 0, g: u.g }); o.v += u.v; });
    root.append(el('h3', { class: 'secao' }, 'Total do mês, por produto'));
    Object.keys(tot).sort().forEach(k => root.append(el('div', { class: 'item' }, el('div', {}, tot[k].produto), el('span', { class: 'val' }, qtdTxt(tot[k].v, tot[k].g)))));
  }
  root.append(el('button', { type: 'button', class: 'btn', onclick: () => pedirRelatorio(mesResumo) }, `Gerar relatório de ${nomeMes(mesResumo)} (Word)`));
  root.append(el('p', { class: 'sub' }, 'O relatório traz a posição do estoque no fim do mês e este resumo por talhão. Ele é salvo na pasta de relatórios, em 1 a 2 minutos.'));
}

async function pedirRelatorio(mes) {
  const id = uid();
  if (!(await guardar({ id_transacao: id, payload: { acao: 'estoque_relatorio', id_transacao: id, mes }, criado: Date.now(), titulo: 'Relatório de estoque ' + mes }))) return;
  toast(`Pedido guardado ✔ O relatório de ${nomeMes(mes)} aparece na pasta em 1 a 2 minutos.`); sincronizar();
}

/* ---------- envios ---------- */
async function abrirPendencias() {
  mostrar('tela-pendencias');
  const root = $('#pendencias-root'); root.replaceChildren();
  const todos = (await DB.todos()).sort((a, b) => a.criado - b.criado);
  const esperando = todos.filter(i => i.status !== 'erro');
  root.append(el('p', { class: 'sub' }, 'Tudo o que você salva fica guardado no celular. Só sai daqui depois que a planilha confirma o recebimento.'));
  if (esperando.length) root.append(el('button', { class: 'btn', onclick: async () => { toast(navigator.onLine ? 'Enviando…' : 'Sem internet agora'); await sincronizar(); abrirPendencias(); } }, `Enviar agora (${esperando.length})`));
  todos.forEach(i => {
    const c = el('div', { class: 'cartao' + (i.status === 'erro' ? ' erro' : '') }, el('strong', {}, i.titulo || 'Lançamento'),
      el('span', { class: 'sub', style: 'display:block' }, new Date(i.criado).toLocaleString('pt-BR')),
      i.status === 'erro' ? el('p', { class: 'erro-msg' }, i.erro) : el('p', { class: 'sub' }, 'Guardado no celular, aguardando envio.'));
    if (i.status === 'erro') {
      c.append(el('button', { class: 'btn sec mini', onclick: async () => { delete i.status; delete i.erro; await DB.put(i); await sincronizar(); abrirPendencias(); } }, 'Tentar de novo'),
        ' ', el('button', { class: 'btn perigo mini', onclick: async () => { if (confirm('Descartar este lançamento? Ele não será enviado.')) { await DB.del(i.id_transacao); abrirPendencias(); renderStatus(); } } }, 'Descartar'));
    }
    root.append(c);
  });
  const env = lerEnviados();
  if (env.length) {
    root.append(el('h3', { class: 'secao' }, 'Já enviados (últimos)'));
    env.slice(0, 25).forEach(e => root.append(el('div', { class: 'item' }, el('div', {}, e.titulo, el('span', { class: 'sub' }, 'Lançado em ' + new Date(e.criado).toLocaleString('pt-BR'))), el('span', { class: 'val' }, '✔'))));
  }
}

/* ---------- início ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#status-sync').onclick = abrirPendencias;
  $('#btn-acesso').onclick = entrarComCodigo;
  $('#campo-codigo').addEventListener('keydown', e => { if (e.key === 'Enter') entrarComCodigo(); });
  document.querySelectorAll('[data-voltar]').forEach(b => b.onclick = irMenu);
  window.addEventListener('online', () => sincronizar()); window.addEventListener('offline', renderStatus);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
  setInterval(() => sincronizar(), 20000);
  setInterval(() => atualizarReceitas(), 30000);   // alerta de receita nova para o aplicador (consulta leve a cada 30 s)
  $('#sino-receitas').onclick = () => { if (S.emFormulario && !confirm('Sair do lançamento atual? O que você digitou aqui será perdido.')) return; abrirAplicar(); };
  window.addEventListener('online', () => atualizarReceitas());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') atualizarReceitas(); });
  $('#alerta-receitas').onclick = () => abrirAplicar();
  $('#alerta-lavagem').onclick = () => abrirModulo(moduloHidrorep());
  $('#alerta-hidrometro').onclick = () => abrirModulo(moduloHidrometro());
  $('#alerta-diesel').onclick = () => { dieselMedindo = false; abrirEstoque('diesel'); };
  $('#alerta-chegadas').onclick = () => { produtoEntrada = null; abrirEstoque('entrada'); };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();   // pede ao navegador para não apagar os dados guardados
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});   // permite abrir o app sem internet
  iniciarApp();
});
