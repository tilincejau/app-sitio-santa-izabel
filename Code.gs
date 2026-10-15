/* =========================================================
   SÍTIO SANTA IZABEL — BACKEND (Google Apps Script)
   Recebe os lançamentos do app, grava nas abas da planilha
   e agenda a geração dos laudos Word (scripts que você já tem).
   ========================================================= */

const CFG = {
  SPREADSHEET_ID: '1hVGUdFfvP-SBlj0XWaJnSsKChrrjoJLzicCo068roC8',
  PASTA_ASSINATURAS: 'COLE_AQUI_ID_DA_PASTA_ASSINATURAS',
  PASTA_NOTAS: 'COLE_AQUI_ID_DA_PASTA_NOTAS_FISCAIS',
  TZ: 'America/Sao_Paulo'
};

// Opcional: um tópico em outra planilha. Ex.: { hidrometro: 'ID_DA_OUTRA_PLANILHA' }
// Vazio = tudo na planilha principal acima.
const PLANILHAS = {};

const MAQ_MANUAL = ['TR05', 'TR10'];   // horímetro inicial digitado à mão
const ENTRADAS_HDR = ['ID', 'DATA', 'PRODUTO_ID', 'PRODUTO', 'QUANTIDADE', 'UNIDADE', 'NF_NUMERO', 'FOTO_NOTA', 'STATUS', 'RESPONSAVEL', 'REGISTRADO_POR'];

const MODS = {   // aba e colunas mostradas em "últimos lançamentos"
  aplicacao:      { aba: 'aplicações',           topico: 'aplicacao',      cols: [1, 2, 3, 4] },
  hidrometro:     { aba: 'hidrômetro',           topico: 'hidrometro',     cols: [0, 1, 2, 3] },
  irrigacao:      { aba: 'irrigação',            topico: 'irrigacao',      cols: [0, 1, 4] },
  pluviometro:    { aba: 'pluviômetro',          topico: 'pluviometro',    cols: [0, 1] },
  hidrorepelente: { aba: 'hidrorepelente',       topico: 'hidrorepelente', cols: [0, 1, 2, 3] },
  abastecimento:  { aba: 'abastecimento',        topico: 'abastecimento',  cols: [0, 1, 4, 5] },
  diesel:         { aba: 'estoque_diesel',       topico: 'diesel',         cols: [0, 1, 2] },
  limpeza_local:  { aba: 'limpeza_local',        topico: 'limpeza_local',  cols: [0] },
  limpeza_equip:  { aba: 'limpeza_equipamentos', topico: 'limpeza_equip',  cols: [0, 1, 2] }
};

const AREAS_LIMPEZA = [
  ['carreadores', 'Carreadores / carregamento / ponto de encontro'], ['lixeiras', 'Lixeiras'],
  ['preparo', 'Área de preparo de defensivos'], ['escritorio', 'Escritório'], ['banheiro', 'Banheiro'],
  ['maquinas', 'Casa de máquinas'], ['defensivos', 'Depósito de defensivos'],
  ['fertilizantes', 'Depósitos de fertilizantes'], ['suprimentos', 'Depósito de suprimentos'],
  ['embalagens', 'Depósito de embalagens vazias'], ['organizacao', 'Organização geral']
];

const LAUDOS_PERMITIDOS = ['processarNovaAplicacao', 'gerarLaudoHidrometro', 'gerarLaudoIrrigacao', 'gerarLaudoPluviometro',
  'gerarLaudoEPI_Word', 'gerarLaudoAbastecimento', 'gerarLaudoDiesel', 'gerarLaudoLimpezaLocal', 'gerarLaudoLimpeza'];

/* ---------- entrada ---------- */
function doGet(e) {
  return responder(function () {
    const p = e.parameter || {};
    if (p.acao === 'ping') return { sucesso: true };
    exigirToken(p.usuario, p.token);
    if (p.acao === 'dados') return buscarDados();
    throw new Error('Ação inválida');
  });
}

function doPost(e) {
  return responder(function () {
    const d = JSON.parse(e.postData.contents);
    if (d.acao === 'login') return login(d);
    exigirToken(d.usuario, d.token);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try { return roteador(d); } finally { lock.releaseLock(); }
  });
}

function responder(fn) {
  let r;
  try { r = fn(); }
  catch (err) {
    const m = String(err && err.message || err);
    r = m === 'AUTH' ? { sucesso: false, codigo: 'AUTH', erro: 'Sessão expirada. Entre novamente.' } : { sucesso: false, erro: m };
  }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- login ---------- */
function segredo() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SEGREDO', s); }
  return s;
}
function gerarToken(u) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(u).toLowerCase().trim(), segredo()));
}
function exigirToken(u, t) { if (!u || !t || gerarToken(u) !== t) throw new Error('AUTH'); }

function login(d) {
  const sh = aba('Usuarios', 'geral');
  if (!sh) throw new Error("Crie a aba 'Usuarios' na planilha (colunas: usuario | senha).");
  const u = String(d.usuario || '').trim().toLowerCase(), s = String(d.senha || '').trim();
  const ok = valores(sh).some(function (r) { return String(r[0]).trim().toLowerCase() === u && String(r[1]).trim() === s; });
  if (!ok) return { sucesso: false, erro: 'Usuário ou senha incorretos.' };
  return { sucesso: true, token: gerarToken(u), usuario: u };
}

/* ---------- utilidades de planilha ---------- */
const _ss = {};
function abrirSS(topico) {
  const id = PLANILHAS[topico] || CFG.SPREADSHEET_ID;
  return _ss[id] || (_ss[id] = SpreadsheetApp.openById(id));
}
function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_]/g, '').toUpperCase(); }

// Acha a aba ignorando maiúsculas/acentos. Se "criar" (cabeçalho) for passado e a aba não existir, cria.
function aba(nome, topico, criar) {
  const ss = abrirSS(topico || 'geral');
  let sh = ss.getSheetByName(nome);
  if (!sh) { const alvo = norm(nome); sh = ss.getSheets().filter(function (s) { return norm(s.getName()) === alvo; })[0] || null; }
  if (!sh && criar) { sh = ss.insertSheet(nome); sh.appendRow(criar); sh.setFrozenRows(1); }
  return sh;
}
function semAba(sh, nome) { if (!sh) throw new Error("Aba '" + nome + "' não encontrada na planilha."); }

function valores(sh) {
  if (!sh) return [];
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues().filter(function (r) { return r.some(function (c) { return c !== '' && c != null; }); });
}

function anexar(sh, linhas, formatos) {
  if (!linhas.length) return;
  const c = linhas[0].length, n = sh.getLastRow() + 1, fim = n + linhas.length - 1;
  if (sh.getMaxColumns() < c) sh.insertColumnsAfter(sh.getMaxColumns(), c - sh.getMaxColumns());
  if (sh.getMaxRows() < fim) sh.insertRowsAfter(sh.getMaxRows(), fim - sh.getMaxRows());
  Object.keys(formatos || {}).forEach(function (i) { sh.getRange(n, +i + 1, linhas.length, 1).setNumberFormat(formatos[i]); });
  sh.getRange(n, 1, linhas.length, c).setValues(linhas);
}

function toDate(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
function parseLocal(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) throw new Error('Data inválida: ' + s);
  return new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}
function num(v) { if (typeof v === 'number') return v; const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }
function round(n, d) { const k = Math.pow(10, d); return Math.round(n * k) / k; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function minutos(hhmm) { const p = String(hhmm || '').split(':'); if (p.length < 2) throw new Error('Horário inválido'); return +p[0] * 60 + +p[1]; }
function hms(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60) + ':00'; }
function uid8() { return Utilities.getUuid().split('-')[0]; }
function iso(d) { return d ? Utilities.formatDate(d, CFG.TZ, "yyyy-MM-dd'T'HH:mm") : ''; }

/* ---------- arquivos ---------- */
function salvarAssinatura(b64, abaNome, base) {
  if (!b64) return '';
  const nome = base + '.ASSINATURA.' + Utilities.formatDate(new Date(), CFG.TZ, 'HHmmss') + '.png';
  const bytes = Utilities.base64Decode(String(b64).split(',')[1] || b64);
  DriveApp.getFolderById(CFG.PASTA_ASSINATURAS).createFile(Utilities.newBlob(bytes, 'image/png', nome));
  return abaNome + '_Images/' + nome;   // mesmo padrão do AppSheet: os laudos procuram pelo nome do arquivo
}
function salvarFoto(b64, nome) {
  const bytes = Utilities.base64Decode(String(b64).split(',')[1] || b64);
  return DriveApp.getFolderById(CFG.PASTA_NOTAS).createFile(Utilities.newBlob(bytes, 'image/jpeg', nome + '.jpg')).getUrl();
}

/* ---------- listas, idempotência, fila de laudos ---------- */
function listas() {
  const o = {};
  valores(aba('Listas', 'geral', ['LISTA', 'VALOR'])).forEach(function (r) { (o[r[0]] = o[r[0]] || []).push(String(r[1])); });
  return o;
}
function addLista(lista, valor) {
  valor = String(valor || '').trim();
  if (!valor) return;
  const sh = aba('Listas', 'geral', ['LISTA', 'VALOR']);
  if (!valores(sh).some(function (r) { return r[0] === lista && String(r[1]).toUpperCase() === valor.toUpperCase(); })) sh.appendRow([lista, valor]);
}
function jaProcessado(id) {
  if (!id) return false;
  const sh = aba('_envios', 'geral', ['ID', 'DATA', 'ACAO', 'USUARIO']), n = sh.getLastRow();
  if (n < 2) return false;
  const ini = Math.max(2, n - 499);
  return sh.getRange(ini, 1, n - ini + 1, 1).getValues().some(function (r) { return r[0] === id; });
}
function registrar(d) { aba('_envios', 'geral', ['ID', 'DATA', 'ACAO', 'USUARIO']).appendRow([d.id_transacao, new Date(), d.modulo || d.acao, d.usuario]); }

function agendarLaudos(lista) {
  if (!lista || !lista.length) return;
  const props = PropertiesService.getScriptProperties();
  const fila = JSON.parse(props.getProperty('FILA_LAUDOS') || '[]');
  lista.forEach(function (l) {
    const item = { fn: l[0], arg: l[1] === undefined ? null : l[1] };
    if (!fila.some(function (f) { return f.fn === item.fn && f.arg === item.arg; })) fila.push(item);
  });
  props.setProperty('FILA_LAUDOS', JSON.stringify(fila));
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'rodarFilaLaudos'; }))
    ScriptApp.newTrigger('rodarFilaLaudos').timeBased().after(5000).create();
}

// Roda sozinha (gatilho). Gera os Word fora do caminho do celular, para o app não ficar esperando.
function rodarFilaLaudos() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let fila;
  try {
    fila = JSON.parse(props.getProperty('FILA_LAUDOS') || '[]');
    props.setProperty('FILA_LAUDOS', '[]');
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'rodarFilaLaudos') ScriptApp.deleteTrigger(t); });
  } finally { lock.releaseLock(); }

  const falhas = [];
  fila.forEach(function (item) {
    try {
      if (LAUDOS_PERMITIDOS.indexOf(item.fn) < 0) throw new Error('Função não permitida: ' + item.fn);
      const f = globalThis[item.fn];
      if (typeof f !== 'function') throw new Error("Função '" + item.fn + "' não encontrada. Cole o script dela neste projeto.");
      item.arg === null ? f() : f(item.arg);
    } catch (e) {
      item.tentativas = (item.tentativas || 0) + 1;
      aba('_erros', 'geral', ['DATA', 'FUNCAO', 'ARGUMENTO', 'ERRO']).appendRow([new Date(), item.fn, item.arg, String(e.message || e)]);
      if (item.tentativas < 3) falhas.push(item);
    }
  });
  if (falhas.length) {
    lock.waitLock(30000);
    try {
      const atual = JSON.parse(props.getProperty('FILA_LAUDOS') || '[]');
      props.setProperty('FILA_LAUDOS', JSON.stringify(falhas.concat(atual)));
      ScriptApp.newTrigger('rodarFilaLaudos').timeBased().after(60000).create();
    } finally { lock.releaseLock(); }
  }
}

/* ---------- produtos ---------- */
function cadastro() {
  const sh = aba('cadastro_produtos', 'aplicacao');
  const lista = [];
  valores(sh).forEach(function (r) {
    if (String(r[2]).trim() === '') return;
    lista.push({ id: String(r[0]).trim(), tipo: r[1], nome: String(r[2]).trim(), principio: String(r[3] || '').trim(), classe: String(r[4] || '').trim() });
  });
  return lista;
}
// Cria o produto no cadastro se ainda não existir; devolve o ID.
function garantirProduto(p) {
  const nome = String(p.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do novo produto');
  const ja = cadastro().filter(function (x) { return norm(x.nome) === norm(nome); })[0];
  if (ja) return ja.id;
  const id = uid8();
  const sh = aba('cadastro_produtos', 'aplicacao');
  semAba(sh, 'cadastro_produtos');
  anexar(sh, [[id, p.tipo || 'Outros', nome, String(p.principio || '').trim(), String(p.classe || '').trim()]]);
  return id;
}
function infoProduto(id) { return cadastro().filter(function (x) { return x.id === String(id); })[0] || null; }

/* ---------- roteador ---------- */
const HANDLERS = {
  aplicacao: h_aplicacao, hidrometro: h_hidrometro, irrigacao: h_irrigacao, pluviometro: h_pluviometro,
  hidrorepelente: h_hidrorepelente, abastecimento: h_abastecimento, diesel: h_diesel,
  limpeza_local: h_limpezaLocal, limpeza_equip: h_limpezaEquip,
  estoque_contagem: h_estoqueContagem, estoque_entrada: h_estoqueEntrada
};

function roteador(d) {
  if (d.acao === 'salvar') {
    const h = HANDLERS[d.modulo];
    if (!h) throw new Error('Módulo desconhecido: ' + d.modulo);
    if (jaProcessado(d.id_transacao)) return { sucesso: true, duplicado: true };
    const r = h(d) || {};
    (d.novasListas || []).forEach(function (n) { addLista(n.lista, n.valor); });
    registrar(d);
    SpreadsheetApp.flush();
    agendarLaudos(r.laudos);
    return { sucesso: true };
  }
  if (d.acao === 'estoque_anexar_nota') {
    if (jaProcessado(d.id_transacao)) return { sucesso: true, duplicado: true };
    h_anexarNota(d); registrar(d);
    return { sucesso: true };
  }
  throw new Error('Ação inválida: ' + d.acao);
}

/* ---------- lançamentos ---------- */
function h_hidrometro(d) {
  const x = d.dados, nome = 'hidrômetro', sh = aba(nome, 'hidrometro'); semAba(sh, nome);
  const dt = parseLocal(x.datahora), ass = salvarAssinatura(x.assinatura, nome, d.id_transacao), rows = valores(sh);
  const hids = Object.keys(x.itens || {});
  if (!hids.length) throw new Error('Escolha o hidrômetro');
  const linhas = hids.map(function (hid) {
    const leitura = num(x.itens[hid].leitura);
    let prev = null;
    rows.forEach(function (r) {
      if (String(r[1]).trim() !== hid) return;
      const rd = toDate(r[0]);
      if (rd && rd < dt && (!prev || rd > prev.d)) prev = { d: rd, l: num(r[2]) };
    });
    let consumo = 0, media = 0;
    if (prev) { consumo = round(leitura - prev.l, 2); media = round(consumo / Math.max(1, (dt - prev.d) / 86400000), 2); }
    return [dt, hid, leitura, consumo, media, x.resp, ass];
  });
  anexar(sh, linhas, { 0: 'dd/MM/yyyy HH:mm' });
  return { laudos: hids.map(function (h) { return ['gerarLaudoHidrometro', h]; }) };
}

function h_irrigacao(d) {
  const x = d.dados, nome = 'irrigação', sh = aba(nome, 'irrigacao'); semAba(sh, nome);
  const dt = parseLocal(x.datahora), ass = salvarAssinatura(x.assinatura, nome, d.id_transacao);
  const areas = Object.keys(x.itens || {});
  if (!areas.length) throw new Error('Escolha ao menos uma área');
  const linhas = areas.map(function (a) {
    const i = minutos(x.itens[a].inicio), f = minutos(x.itens[a].fim);
    let dur = f - i; if (dur < 0) dur += 1440;
    return [dt, a, hms(i), hms(f), hms(dur), x.resp, ass];
  });
  anexar(sh, linhas, { 0: 'dd/MM/yyyy HH:mm', 2: 'HH:mm:ss', 3: 'HH:mm:ss', 4: 'HH:mm:ss' });
  const talhoes = {};
  areas.forEach(function (a) { talhoes[a.split(',')[0].trim()] = a; });
  return { laudos: Object.keys(talhoes).map(function (k) { return ['gerarLaudoIrrigacao', talhoes[k]]; }) };
}

function h_pluviometro(d) {
  const x = d.dados, nome = 'pluviômetro', sh = aba(nome, 'pluviometro'); semAba(sh, nome);
  anexar(sh, [[parseLocal(x.datahora), num(x.leitura), x.resp, salvarAssinatura(x.assinatura, nome, d.id_transacao)]], { 0: 'dd/MM/yyyy HH:mm' });
  return { laudos: [['gerarLaudoPluviometro']] };
}

function h_hidrorepelente(d) {
  const x = d.dados, nome = 'hidrorepelente', sh = aba(nome, 'hidrorepelente'); semAba(sh, nome);
  const resp = String(x.resp).trim();
  const minhas = valores(sh).filter(function (r) { return String(r[4]).trim() === resp; });
  const ultima = minhas[minhas.length - 1];
  const conjunto = ultima ? (String(ultima[3]).trim() === 'Conjunto 1' ? 'Conjunto 2' : 'Conjunto 1') : 'Conjunto 1';
  const mesmas = minhas.filter(function (r) { return String(r[3]).trim() === conjunto; });
  const ult = mesmas[mesmas.length - 1];
  const n = ult ? (num(ult[2]) >= 30 ? 1 : num(ult[2]) + 1) : 1;
  anexar(sh, [[parseLocal(x.data), x.talhao, n, conjunto, resp, salvarAssinatura(x.assinatura, nome, d.id_transacao)]], { 0: 'dd/MM/yyyy' });
  return { laudos: [['gerarLaudoEPI_Word', resp]] };
}

function h_abastecimento(d) {
  const x = d.dados, nome = 'abastecimento', sh = aba(nome, 'abastecimento'); semAba(sh, nome);
  const maq = String(x.maquina || '').trim();
  if (!maq) throw new Error('Informe a máquina');
  const rows = valores(sh).filter(function (r) { return String(r[1]).trim() === maq; });
  const ini = (MAQ_MANUAL.indexOf(maq) < 0 && rows.length) ? num(rows[rows.length - 1][3]) : num(x.horIni);
  const fim = num(x.horFim), lit = num(x.litros);
  if (fim < ini) throw new Error('Horímetro final (' + fim + ') menor que o inicial (' + ini + ')');
  const media = (fim - ini) > 0 ? round(lit / (fim - ini), 2) : 0;
  anexar(sh, [[parseLocal(x.data), maq, ini, fim, lit, media, x.resp, salvarAssinatura(x.assinatura, nome, d.id_transacao)]], { 0: 'dd/MM/yyyy' });
  return { laudos: [['gerarLaudoAbastecimento', maq]] };
}

function h_diesel(d) {
  const x = d.dados, nome = 'estoque_diesel', sh = aba(nome, 'diesel'); semAba(sh, nome);
  anexar(sh, [[parseLocal(x.data), x.nf, num(x.litros), x.resp, salvarAssinatura(x.assinatura, nome, d.id_transacao)]], { 0: 'dd/MM/yyyy' });
  return { laudos: [['gerarLaudoDiesel']] };
}

function h_limpezaLocal(d) {
  const x = d.dados, nome = 'limpeza_local', sh = aba(nome, 'limpeza_local'); semAba(sh, nome);
  const problemas = [];
  const status = AREAS_LIMPEZA.map(function (a) {
    const it = (x.areas || {})[a[0]] || {};
    if (!it.status) throw new Error('Falta informar: ' + a[1]);
    if (String(it.obs || '').trim()) problemas.push(a[1] + ': ' + String(it.obs).trim());
    return it.status;
  });
  anexar(sh, [[parseLocal(x.data)].concat(status, [problemas.join(' | ') || '-', x.resp, salvarAssinatura(x.assinatura, nome, d.id_transacao)])], { 0: 'dd/MM/yyyy' });
  return { laudos: [['gerarLaudoLimpezaLocal']] };
}

function h_limpezaEquip(d) {
  const x = d.dados, nome = 'limpeza_equipamentos', sh = aba(nome, 'limpeza_equip'); semAba(sh, nome);
  anexar(sh, [[parseLocal(x.data), x.item, num(x.qtd), 'DIOXIPLUS A 0,1%', x.procedimento, x.resp, salvarAssinatura(x.assinatura, nome, d.id_transacao)]], { 0: 'dd/MM/yyyy' });
  return { laudos: [['gerarLaudoLimpeza']] };
}

/* ---------- aplicação (pulverização / adubação) ---------- */
function h_aplicacao(d) {
  const x = d.dados, id = uid8();
  const sh = aba('aplicações', 'aplicacao'), shp = aba('produtos_Aplicados', 'aplicacao');
  semAba(sh, 'aplicações'); semAba(shp, 'produtos_Aplicados');
  if (!(x.produtos || []).length) throw new Error('Adicione ao menos um produto');
  const adub = norm(x.aplicacao).indexOf('ADUBA') === 0;
  const A = x.areas || {}, a = A.A || {}, b = A.B || {};
  if (!a.inicio && !b.inicio) throw new Error('Escolha a área (A e/ou B)');

  const mapa = {}; cadastro().forEach(function (p) { mapa[p.id] = p; });
  const linhasProd = x.produtos.map(function (p) {
    let pid = p.id, principio, classe;
    if (pid === 'NOVO') { pid = garantirProduto(p); principio = p.principio; classe = p.classe; }
    else { const c = mapa[pid] || {}; principio = c.principio || ''; classe = c.classe || ''; }
    if (adub) { const pes = num(p.pes), dp = num(p.dosePlanta); return [uid8(), id, pid, principio, classe, '', p.unidade, pes, dp, round(pes * dp, 3)]; }
    return [uid8(), id, pid, principio, classe, num(p.dosagem), p.unidade, '', '', 0];
  });
  anexar(shp, linhasProd);

  const dtf = function (v) { return v ? parseLocal(v) : ''; };
  escreverPorCabecalho(sh, {
    ID: id, APLICACAO: x.aplicacao, TIPO: x.tipo, TALHAO: x.talhao, AREA: Object.keys(A).sort().join(' , '),
    DATA_HORA_INICIO_A: dtf(a.inicio), DATA_HORA_FIM_A: dtf(a.fim), DATA_HORA_INICIO_B: dtf(b.inicio), DATA_HORA_FIM_B: dtf(b.fim),
    JUSTIFICATIVA: x.justificativa, CULTURA: x.cultura, VARIEDADE: x.variedade, ALVO: x.alvo, FASE_FENOLOGICA: x.fase,
    METODO_APLICACAO: x.metodo, VOLUME_CALDA: x.volume, PREVISAO_COLHEITA: x.previsao, PH: x.ph, VAZAO_L_HA: x.vazao,
    TRATOR: x.trator, MARCHA: x.marcha, RPM: x.rpm, IMPLEMENTO: x.implemento, PRESSAO: x.pressao, BICO: x.bico,
    REENTRADA: x.reentrada, LITROS_RECEITA: x.volume,   // mantido igual ao volume da calda para não quebrar o modelo Word
    CARENCIA: x.carencia, NUMERO_APLICACOES_A: a.n ? num(a.n) : '', NUMERO_APLICACOES_B: b.n ? num(b.n) : '',
    INTERVALO_APLICACOES: x.intervalo, CONDICOES_METEOROLOGICAS: x.condicoes, VELOCIDADE_VENTO: x.vento, EPI: x.epi,
    MISTURA_TANQUE: x.mistura, CUIDADOS_DESCARTE: x.descarte, SOBRA_CALDA: x.sobra, OBSERVACOES_ADICIONAIS: x.obs,
    APLICADOR: x.aplicador, ASSINATURA: salvarAssinatura(x.assinatura, 'aplicações', id)
  });
  return { laudos: [['processarNovaAplicacao', id]] };
}

// Grava a linha casando pelo NOME da coluna (ignora acento, espaço e maiúscula), então a ordem das colunas não importa.
function escreverPorCabecalho(sh, obj) {
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const m = {}; Object.keys(obj).forEach(function (k) { m[norm(k)] = obj[k]; });
  const linha = cab.map(function (h) { const v = m[norm(h)]; return v === undefined ? '' : v; });
  const n = sh.getLastRow() + 1;
  if (sh.getMaxRows() < n) sh.insertRowsAfter(sh.getMaxRows(), 1);
  cab.forEach(function (h, i) { if (norm(h).indexOf('DATAHORA') === 0) sh.getRange(n, i + 1).setNumberFormat('dd/MM/yyyy HH:mm'); });
  sh.getRange(n, 1, 1, cab.length).setValues([linha]);
}

/* ---------- estoque ---------- */
function h_estoqueContagem(d) {
  const x = d.dados, sh = aba('controle_estoque', 'estoque'); semAba(sh, 'controle_estoque');
  const p = infoProduto(x.produtoId);
  anexar(sh, [[uid8(), parseLocal(x.data), x.produtoId, p ? p.nome : x.produtoId, num(x.qtd), x.unidade]], { 1: 'dd/MM/yyyy' });
}

function h_estoqueEntrada(d) {
  const x = d.dados, sh = aba('entradas_estoque', 'estoque', ENTRADAS_HDR);
  let pid = x.produtoId, nome;
  if (pid === 'NOVO') { pid = garantirProduto({ nome: x.nome, principio: x.principio, classe: x.classe }); nome = String(x.nome).trim(); }
  else { const p = infoProduto(pid); if (!p) throw new Error('Produto não encontrado'); nome = p.nome; }
  const id = uid8();
  const foto = x.foto ? salvarFoto(x.foto, 'NF_' + id) : '';
  anexar(sh, [[id, parseLocal(x.data), pid, nome, num(x.qtd), x.unidade, x.nf || '', foto, foto ? 'A CONFERIR' : 'SEM NOTA', x.resp, d.usuario]], { 1: 'dd/MM/yyyy' });
}

function h_anexarNota(d) {
  const sh = aba('entradas_estoque', 'estoque', ENTRADAS_HDR), rows = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id_entrada)) {
      sh.getRange(i + 2, 8).setValue(salvarFoto(d.foto, 'NF_' + d.id_entrada));
      sh.getRange(i + 2, 9).setValue('A CONFERIR');
      if (d.nf) sh.getRange(i + 2, 7).setValue(d.nf);
      return;
    }
  }
  throw new Error('Entrada não encontrada');
}

function unBase(q, u) {
  u = String(u || '').toUpperCase().trim();
  if (u === 'L') return { v: q * 1000, g: 'vol' };
  if (u === 'ML') return { v: q, g: 'vol' };
  if (u === 'KG') return { v: q * 1000, g: 'mass' };
  if (u === 'G') return { v: q, g: 'mass' };
  return { v: q, g: u || 'vol' };
}
function paraExibir(v, g) {
  if (g === 'vol') return Math.abs(v) >= 1000 ? { q: v / 1000, un: 'L' } : { q: v, un: 'ML' };
  if (g === 'mass') return Math.abs(v) >= 1000 ? { q: v / 1000, un: 'KG' } : { q: v, un: 'G' };
  return { q: v, un: g };
}

// saldo = última contagem + entradas − saídas (pulverização/adubação) feitas desde a contagem
function calcularEstoque() {
  const mapa = {};
  const get = function (nome) { const k = norm(nome); return mapa[k] || (mapa[k] = { nome: String(nome).trim(), g: null, inv: 0, invData: null, ent: [], sai: [] }); };
  valores(aba('controle_estoque', 'estoque')).forEach(function (r) {
    const d = toDate(r[1]); if (!d || !(r[3] || r[2])) return;
    const p = get(r[3] || r[2]), b = unBase(num(r[4]), r[5]);
    if (!p.invData || d >= p.invData) { p.invData = d; p.inv = b.v; p.g = b.g; }
  });
  valores(aba('entradas_estoque', 'estoque')).forEach(function (r) {
    const d = toDate(r[1]); if (!d || !r[3]) return;
    const b = unBase(num(r[4]), r[5]); get(r[3]).ent.push({ d: d, v: b.v, g: b.g });
  });
  valores(aba('estoque_usado', 'estoque')).forEach(function (r) {
    const d = toDate(r[1]), m = String(r[6]).match(/(-?[\d.,]+)\s*([A-Za-z]+)/);
    if (!d || !m || !r[3]) return;
    const b = unBase(parseFloat(m[1].replace(',', '.')), m[2]); get(r[3]).sai.push({ d: d, v: b.v, g: b.g });
  });
  return Object.keys(mapa).map(function (k) {
    const p = mapa[k]; let saldo = p.inv, g = p.g;
    p.ent.forEach(function (e) { if (!p.invData || e.d >= p.invData) { saldo += e.v; g = g || e.g; } });
    p.sai.forEach(function (s) { if (!p.invData || s.d >= p.invData) { saldo -= s.v; g = g || s.g; } });
    const x = paraExibir(saldo, g || 'vol');
    return { nome: p.nome, saldo: round(x.q, 2), un: x.un, contagem: p.invData ? Utilities.formatDate(p.invData, CFG.TZ, 'dd/MM/yyyy') : '', negativo: saldo < 0 };
  }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}

/* ---------- dados para o app ---------- */
function buscarDados() {
  const out = { sucesso: true, produtos: [], classes: [], listas: listas(), estado: { hidro: {}, hidrorep: {}, abast: {} }, ultimos: {}, estoque: [], entradasSemNota: [] };
  out.produtos = cadastro().sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  const cl = {}; out.produtos.forEach(function (p) { if (p.classe) cl[p.classe] = 1; });
  out.classes = Object.keys(cl);

  valores(aba('hidrômetro', 'hidrometro')).forEach(function (r) {
    const hid = String(r[1]).trim(), dt = toDate(r[0]); if (!hid || !dt) return;
    const at = out.estado.hidro[hid];
    if (!at || iso(dt) >= at.data) out.estado.hidro[hid] = { data: iso(dt), leitura: num(r[2]) };
  });
  valores(aba('hidrorepelente', 'hidrorepelente')).forEach(function (r) {
    const resp = String(r[4]).trim(); if (!resp) return;
    const e = out.estado.hidrorep[resp] || (out.estado.hidrorep[resp] = { conjunto: '', n: {} });
    e.conjunto = String(r[3]).trim(); e.n[e.conjunto] = num(r[2]);
  });
  valores(aba('abastecimento', 'abastecimento')).forEach(function (r) { const m = String(r[1]).trim(); if (m) out.estado.abast[m] = num(r[3]); });

  Object.keys(MODS).forEach(function (k) {
    const sh = aba(MODS[k].aba, MODS[k].topico); if (!sh) return;
    const n = sh.getLastRow(); if (n < 2) { out.ultimos[k] = []; return; }
    const ini = Math.max(2, n - 4);
    out.ultimos[k] = sh.getRange(ini, 1, n - ini + 1, sh.getLastColumn()).getDisplayValues()
      .filter(function (r) { return r.some(function (c) { return c !== ''; }); })
      .map(function (r) { return MODS[k].cols.map(function (i) { return r[i]; }); }).reverse();
  });

  out.estoque = calcularEstoque();
  valores(aba('entradas_estoque', 'estoque', ENTRADAS_HDR)).forEach(function (r) {
    if (r[8] === 'SEM NOTA') out.entradasSemNota.push({ id: String(r[0]), data: iso(toDate(r[1])).slice(0, 10), produto: r[3], qtd: r[4], un: r[5] });
  });
  return out;
}
