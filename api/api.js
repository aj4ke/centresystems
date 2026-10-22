// api.js - backend for centresystems.info.
//
// Caddy proxies /api/* here:
//   GET /api/status          game server status from Zabbix
//   GET /api/repos           your public GitHub repos
//   GET /api/readme/<repo>   one repo's info plus its README (markdown)

const http = require('http');

const env = process.env;
const PORT = Number(env.PORT || 3001);

// site id (data-srv in index.html) -> Zabbix host name
const SERVERS = {
  cs2: 'cs2',
  ark: 'ark',
  minecraft: 'minecraft',
};
const ZBX_KEYS = ['game.status', 'game.players', 'game.players.max'];
const STALE_S = 300; // Zabbix data older than this shows as unknown

const TTL = { status: 15, repos: 600, readme: 600 }; // seconds

const cache = new Map();

function cached(key, ttlS, fn) {
  let entry = cache.get(key);
  if (!entry) cache.set(key, (entry = {}));
  if (entry.value !== undefined && Date.now() - entry.at < ttlS * 1000) return Promise.resolve(entry.value);
  if (!entry.inflight) {
    entry.inflight = fn()
      .then((v) => { entry.value = v; entry.at = Date.now(); return v; })
      .catch((e) => { if (entry.value !== undefined && e.status !== 404) return entry.value; throw e; })
      .finally(() => { entry.inflight = null; });
  }
  return entry.inflight;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ---- Zabbix

async function zbx(method, params) {
  if (!env.ZBX_URL || !env.ZBX_TOKEN) throw new Error('ZBX_URL / ZBX_TOKEN not set');
  const res = await fetch(env.ZBX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json-rpc', 'Authorization': 'Bearer ' + env.ZBX_TOKEN },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    signal: AbortSignal.timeout(5000),
  });
  const j = await res.json();
  if (j.error) throw new Error('zabbix: ' + (j.error.data || j.error.message));
  return j.result;
}

async function gameStatus() {
  const now = Math.floor(Date.now() / 1000);

  const hosts = await zbx('host.get', { output: ['hostid', 'host'], filter: { host: Object.values(SERVERS) } });
  const nameById = {};
  for (const h of hosts) nameById[h.hostid] = h.host;

  const items = hosts.length ? await zbx('item.get', {
    output: ['hostid', 'key_', 'lastvalue', 'lastclock'],
    hostids: Object.keys(nameById),
    filter: { key_: ZBX_KEYS },
  }) : [];

  const byHost = {};
  for (const it of items) {
    const h = nameById[it.hostid];
    (byHost[h] ||= {})[it.key_] = { value: it.lastvalue, clock: Number(it.lastclock) };
  }

  const fresh = (i) => i && i.clock > 0 && now - i.clock <= STALE_S;
  const num = (i) => (fresh(i) && i.value !== '' ? Number(i.value) : null);

  const servers = {};
  for (const [id, host] of Object.entries(SERVERS)) {
    const k = byHost[host] || {};
    const st = k['game.status'];
    const status = !fresh(st) ? 'unknown' : Number(st.value) === 1 ? 'up' : 'down';
    servers[id] = {
      status,
      players: status === 'up' ? num(k['game.players']) : null,
      max: num(k['game.players.max']),
    };
  }
  return { updated: now, servers };
}

// ---- GitHub

async function gh(path, raw = false) {
  const headers = {
    'Accept': raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'User-Agent': 'centresystems.info',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + env.GITHUB_TOKEN;
  const base = env.GITHUB_API || 'https://api.github.com';
  const res = await fetch(base + path, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw httpError(res.status === 404 ? 404 : 502, 'github ' + res.status + ' ' + path);
  return raw ? res.text() : res.json();
}

async function repos() {
  if (!env.GITHUB_USER) throw new Error('GITHUB_USER not set');
  const user = encodeURIComponent(env.GITHUB_USER);
  const list = await gh(`/users/${user}/repos?type=owner&sort=pushed&per_page=100`);
  const topic = env.GITHUB_TOPIC;
  return list
    .filter((r) => !r.fork && !r.private && (!topic || (r.topics || []).includes(topic)))
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      pushed: r.pushed_at,
      url: r.html_url,
      homepage: r.homepage || null,
      topics: r.topics || [],
    }));
}

async function readme(name) {
  const list = await cached('repos', TTL.repos, repos);
  const repo = list.find((r) => r.name === name);
  if (!repo) throw httpError(404, 'no such repo: ' + name);
  let markdown = '';
  try {
    markdown = await gh(`/repos/${encodeURIComponent(env.GITHUB_USER)}/${encodeURIComponent(name)}/readme`, true);
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  return { user: env.GITHUB_USER, repo, markdown };
}

// ---- server

const routes = [
  [/^\/api\/status$/, () => cached('status', TTL.status, gameStatus)],
  [/^\/api\/repos$/, async () => ({ user: env.GITHUB_USER, repos: await cached('repos', TTL.repos, repos) })],
  [/^\/api\/readme\/([A-Za-z0-9._-]{1,100})$/, (m) => cached('readme:' + m[1], TTL.readme, () => readme(m[1]))],
];

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const route = req.method === 'GET' && routes.find(([re]) => re.test(path));
  if (!route) return send(res, 404, { error: 'not found' });
  try {
    send(res, 200, await route[1](path.match(route[0])));
  } catch (e) {
    if (e.status !== 404) console.error(path, e.message);
    send(res, e.status === 404 ? 404 : 502, { error: e.status === 404 ? 'not found' : 'upstream unavailable' });
  }
}).listen(PORT, '127.0.0.1', () => console.log('centre api on 127.0.0.1:' + PORT));
