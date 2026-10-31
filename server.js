// Queimada Aero — servidor para o Render
// Lê a sua live do TikTok (comentários, likes e presentes) e manda pro jogo em tempo real.
// Configure no Render a variável TIKTOK_USER com o link da sua live, o link curto do app ou o seu @.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import * as TT from 'tiktok-live-connector';

const PORT = process.env.PORT || 3000;
let RAW = (process.env.TIKTOK_USER || process.env.TIKTOK_LIVE || '').trim();   // pode ficar vazio: dá pra conectar pelo jogo
let USER = '';
// aceita: "praia.aero", "@praia.aero", "https://www.tiktok.com/@praia.aero/live" ou link curto "https://vm.tiktok.com/XXXX"
const fromText = t => { const m = String(t).match(/@([\w.\-]+)/); return m ? m[1] : ''; };
async function resolveUser() {
  if (!RAW) return '';
  const direct = fromText(RAW);
  if (direct) return direct;
  if (/^https?:\/\//i.test(RAW)) {
    try {
      const r = await fetch(RAW, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const found = fromText(r.url) || fromText(await r.text().catch(() => ''));
      if (found) return found;
    } catch (e) { console.log('[tiktok] não consegui abrir o link:', e?.message || e); }
    return '';
  }
  return RAW.replace(/^@/, '');
}
const SIGN_KEY = process.env.SIGN_API_KEY || '';   // opcional

const clients = new Set();
let status = { connected: false, user: USER, msg: 'iniciando…' };

function send(obj) {
  const line = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of clients) res.write(line);
}
function setStatus(connected, msg) {
  status = { connected, user: USER || RAW, msg };
  send({ type: 'status', ...status });
  console.log('[tiktok]', msg);
}

// os nomes dos campos mudam entre versões da biblioteca; lemos de forma tolerante
const nameOf = e => e?.user?.displayId || e?.user?.uniqueId || e?.uniqueId || e?.user?.nickname || e?.nickname || 'alguém';

let conn = null, retryTimer = null, connecting = false;
function retry(seconds) { clearTimeout(retryTimer); retryTimer = setTimeout(connect, seconds * 1000); }

function makeConnection() {
  const Conn = TT.TikTokLiveConnection || TT.WebcastPushConnection || TT.default?.TikTokLiveConnection;
  // NÃO ligar enableExtendedGiftInfo: ele baixa a lista de presentes, e a Euler Stream só assina isso no plano pago (dá erro e não conecta)
  const opts = {};
  if (SIGN_KEY) opts.signApiKey = SIGN_KEY;
  return new Conn(USER, opts);
}

async function connect() {
  clearTimeout(retryTimer);
  if (!USER) USER = await resolveUser();
  if (!USER) {
    setStatus(false, RAW ? 'não entendi esse link — cole o link da live ou o seu @' : 'cole o link da live em ⚙ Chat e toque em Conectar');
    if (RAW) retry(60);
    return;
  }
  if (connecting) return;
  connecting = true;
  try {
    if (conn) { try { await conn.disconnect(); } catch (e) {} }
    conn = makeConnection();

    conn.on('chat', e => {
      const text = e?.content ?? e?.comment ?? '';
      if (text) send({ type: 'chat', user: nameOf(e), text });
    });
    conn.on('like', e => {
      const count = Number(e?.count ?? e?.likeCount ?? 1) || 1;
      send({ type: 'like', user: nameOf(e), count });
    });
    conn.on('gift', e => {
      const g = e?.gift || e?.giftDetails || e?.extendedGiftInfo || {};
      const type = g.type ?? g.giftType ?? e?.giftType;
      const end = e?.repeatEnd;
      if (type === 1 && !(end === 1 || end === true)) return;   // presente em sequência: conta só no final
      const id = Number(e?.giftId ?? g.id);
      send({
        type: 'gift', user: nameOf(e),
        name: g.name || g.giftName || e?.giftName || (id === 5655 ? 'Rosa' : 'presente'),
        count: Number(e?.repeatCount) || 1,
        diamonds: Number(g.diamondCount ?? g.diamond_count ?? e?.diamondCount) || 1,
      });
    });
    conn.on('streamEnd', () => { setStatus(false, 'a live terminou'); retry(60); });
    conn.on('disconnected', () => { setStatus(false, 'desconectado — tentando de novo em 30s'); retry(30); });
    conn.on('error', err => console.log('[tiktok] erro:', err?.message || err));

    await conn.connect();
    setStatus(true, `conectado na live de @${USER} ✅`);
  } catch (err) {
    const why = String(err?.message || err);
    const offline = /offline|isn't online|not online|UserOffline/i.test(why + (err?.name || ''));
    const plan = /requires a|plan|sign/i.test(why);
    setStatus(false, offline ? 'sua live ainda não está aberta — tento de novo em 30s'
      : plan ? `o serviço que assina a conexão recusou (${why.slice(0, 70)}). Tento de novo em 30s`
      : `não conectou (${why.slice(0, 90)}). Tento de novo em 30s`);
    console.log('[tiktok] detalhe do erro:', why);
    retry(30);
  } finally {
    connecting = false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'status', ...status })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ...status, jogosAbertos: clients.size }));
    return;
  }
  if (url.pathname === '/conectar') {
    const alvo = (url.searchParams.get('alvo') || '').trim();
    if (alvo) { RAW = alvo; USER = ''; connecting = false; connect(); }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(alvo ? 'Conectando…' : 'Faltou o link');
    return;
  }
  if (url.pathname === '/reconectar') {
    connect();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Tentando conectar na live de novo…');
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = await readFile(new URL('./index.html', import.meta.url));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não achei o index.html no projeto.');
    }
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('não encontrado');
});

// mantém as conexões vivas
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000);

server.listen(PORT, () => {
  console.log(`Queimada Aero rodando na porta ${PORT}`);
  connect();
});
