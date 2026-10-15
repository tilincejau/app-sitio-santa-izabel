/* Guarda o app no celular para abrir mesmo sem internet. Ao mudar qualquer arquivo do app, aumente o número da versão. */
const VERSAO = 'sitio-v2';
const ARQUIVOS = ['./', 'index.html', 'style.css', 'script.js', 'logo.png', 'icone-192.png', 'icone-512.png', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Abre do cache na hora e atualiza em segundo plano (a versão nova aparece na próxima abertura).
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // chamadas ao Google não passam por aqui
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const rede = fetch(e.request).then(r => { if (r.ok) caches.open(VERSAO).then(c => c.put(e.request, r.clone())); return r; })
      .catch(() => hit || caches.match('index.html'));
    return hit || rede;
  }));
});
