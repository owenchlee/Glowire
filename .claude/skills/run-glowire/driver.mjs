// Glowire run driver: start the Expo web build on a FREE port, open it in Chrome, screenshot it, stop it.
//
//   node .claude/skills/run-glowire/driver.mjs start [--port N]   start Metro (web) in the background, wait for the bundle
//   node .claude/skills/run-glowire/driver.mjs status             print the URL if our server is up
//   node .claude/skills/run-glowire/driver.mjs open [route]       open http://localhost:<port><route> in the user's Chrome
//   node .claude/skills/run-glowire/driver.mjs shot [route] [out.png] [--size 844,390] [--wait ms]
//                                                                 headless-Chrome screenshot (separate throwaway profile)
//   node .claude/skills/run-glowire/driver.mjs play [--size W,H] "<step>" ...
//                                                                 scripted clicks/keys/screenshots (steps: see play())
//   node .claude/skills/run-glowire/driver.mjs stop               kill only the server this driver started
//
// It never reuses or kills a port something else is listening on (the user often has `expo start` on 8081).
// State (port, pid, log path) lives in .expo/run-glowire.json, which is gitignored.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { Buffer } from 'node:buffer';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const unit = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const stateDir = join(unit, '.expo');
const stateFile = join(stateDir, 'run-glowire.json');
const logFile = join(stateDir, 'run-glowire.log');

const CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p));

const [cmd = 'help', ...rest] = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = rest[i + 1];
  rest.splice(i, 2);
  return v;
};

// Routes may be given as `world/glowtown` or `/world/glowtown`. Git Bash (MSYS) rewrites a bare `/x` argument
// into `C:/Program Files/Git/x`; undo that here so the driver works from either shell.
const route = (r = '/') => {
  const msys = r.match(/^[A-Za-z]:[\\/].*?[\\/]Git[\\/]?(.*)$/);
  if (msys) r = msys[1];
  return '/' + r.replace(/\\/g, '/').replace(/^\/+/, '');
};

const readState = () => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }
};

// A port is free only if we can bind it on BOTH IPv4 and IPv6 (Expo listens on `::`).
const canBind = (port, host) =>
  new Promise((ok) => {
    const s = net.createServer();
    s.once('error', () => ok(false));
    s.listen({ port, host, exclusive: true }, () => s.close(() => ok(true)));
  });
const isFree = async (port) => (await canBind(port, '0.0.0.0')) && (await canBind(port, '::'));
async function freePort(from) {
  for (let p = from; p < from + 200; p++) if (await isFree(p)) return p;
  throw new Error(`no free port in ${from}..${from + 199}`);
}

async function get(url, timeoutMs = 5000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    return { status: r.status, text: await r.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function up() {
  const s = readState();
  if (!s || !alive(s.pid)) return null;
  const r = await get(`http://localhost:${s.port}/`);
  return r && r.status === 200 ? s : null;
}

async function start() {
  const existing = await up();
  if (existing)
    return console.log(`already running: http://localhost:${existing.port}  (pid ${existing.pid})`);

  const asked = flag('port');
  const port = asked ? Number(asked) : await freePort(8100);
  if (asked && !(await isFree(port)))
    throw new Error(`port ${port} is in use; pick another or omit --port`);

  mkdirSync(stateDir, { recursive: true });
  const log = openSync(logFile, 'w');
  // BROWSER=none: `expo start --web` would otherwise pop a browser tab itself. CI is NOT set (it disables reloads).
  const child = spawn(`npx expo start --web --port ${port}`, {
    cwd: unit,
    shell: true,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, BROWSER: 'none', EXPO_NO_TELEMETRY: '1' },
  });
  child.unref();
  writeFileSync(stateFile, JSON.stringify({ port, pid: child.pid, log: logFile }, null, 2));
  console.log(`starting expo web on port ${port} (pid ${child.pid}), log: ${logFile}`);

  // 1) wait for Metro to answer, 2) fetch the bundle once so the first browser load isn't a 60s blank page.
  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 240_000;
  let html = null;
  while (Date.now() < deadline) {
    const r = await get(`${base}/`);
    if (r?.status === 200) {
      html = r.text;
      break;
    }
    if (!alive(child.pid)) throw new Error(`expo exited early, see ${logFile}`);
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  if (!html) throw new Error(`Metro never answered on ${base}, see ${logFile}`);
  const src = html.match(/<script[^>]+src="([^"]+\.bundle[^"]*)"/)?.[1];
  if (src) {
    const t0 = Date.now();
    const b = await get(new URL(src, base).href, 300_000);
    if (!b || b.status !== 200)
      throw new Error(`bundle failed (${b?.status}). First lines:\n${b?.text?.slice(0, 800)}`);
    console.log(
      `bundle ok: ${(b.text.length / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`,
    );
  }
  console.log(`ready: ${base}`);
}

async function need() {
  const s = await up();
  if (!s) throw new Error('server not running: run `driver.mjs start` first');
  return s;
}

async function open() {
  const s = await need();
  if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH');
  const url = `http://localhost:${s.port}${route(rest[0])}`;
  // Hands the URL to the user's running Chrome (new window), so Claude-in-Chrome tools can drive it.
  spawn(CHROME, ['--new-window', url], { detached: true, stdio: 'ignore' }).unref();
  console.log(`opened in Chrome: ${url}`);
}

async function shot() {
  const s = await need();
  if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH');
  const size = flag('size', '844,390'); // iPhone 14 landscape (CSS px)
  const wait = flag('wait', '8000');
  const path = route(rest[0]);
  const name = path.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'home';
  const out = resolve(rest[1] ?? join(stateDir, 'shots', `${name}.png`));
  mkdirSync(dirname(out), { recursive: true });
  // Own throwaway profile: the user's Chrome is usually running, and sharing its profile would hand the job to it.
  const profile = join(os.tmpdir(), 'glowire-headless-profile');
  execFileSync(
    CHROME,
    [
      '--headless=new',
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--enable-unsafe-swiftshader', // WebGL for the 3D puzzle board without a GPU
      `--window-size=${size}`,
      `--virtual-time-budget=${wait}`,
      `--screenshot=${out}`,
      `http://localhost:${s.port}${path}`,
    ],
    { stdio: 'ignore', timeout: Number(wait) + 60_000 },
  );
  console.log(`screenshot: ${out}`);
}

// ---- play: scripted interaction over the Chrome DevTools Protocol (headless, own profile, own free port) ----
// Steps (each one argv string):
//   goto <route>            navigate (route like world/glowtown, level/1)
//   click <x>,<y>           real mouse click at CSS px (RN-web Pressables need real pointer events, not el.click())
//   drag x,y x,y ...        mouse-down at the first point, move through the rest, release (draws puzzle wires)
//   tap <text>             click the centre of the smallest visible element whose text is exactly <text>
//   key <Key> [n]           press+release n times (ArrowRight, Enter, e, ...)
//   hold <Key> <ms>         hold a key down (the hero walks while an arrow/WASD key is held)
//   dialog                  tap through the story dialog until it closes; walking is blocked until then
//   wait <ms>               sleep
//   shot <file.png>         screenshot (relative to .expo/shots/)
//   eval <js>               run JS in the page, print the JSON result
//   text                    print the page's visible text (cheap way to read dialogs/buttons)
async function play() {
  const s = await need();
  if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH');
  const [w, h] = flag('size', '844,390').split(',').map(Number);
  const steps = [...rest];
  const debugPort = await freePort(9300);
  const profile = join(os.tmpdir(), `glowire-cdp-${debugPort}`);
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      `--window-size=${w},${h}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      await sleep(200);
      const r = await get(`http://127.0.0.1:${debugPort}/json/list`);
      target = r && JSON.parse(r.text).find((t) => t.type === 'page');
    }
    if (!target) throw new Error('headless Chrome did not expose a page target');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok, no) => ((ws.onopen = ok), (ws.onerror = no)));
    let id = 0;
    const pending = new Map();
    const logs = [];
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      } else if (msg.method === 'Runtime.exceptionThrown')
        logs.push(
          `EXCEPTION ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`,
        );
      else if (
        msg.method === 'Runtime.consoleAPICalled' &&
        ['error', 'warning'].includes(msg.params.type)
      )
        logs.push(
          `${msg.params.type} ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`,
        );
    };
    const send = (method, params = {}) =>
      new Promise((ok, no) => {
        const n = ++id;
        pending.set(n, (msg) =>
          msg.error ? no(new Error(`${method}: ${msg.error.message}`)) : ok(msg.result),
        );
        ws.send(JSON.stringify({ id: n, method, params }));
      });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails)
        throw new Error(
          `eval: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`,
        );
      return r.result.value;
    };
    const click = async (x, y) => {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
        await send('Input.dispatchMouseEvent', {
          type,
          x,
          y,
          button: 'left',
          buttons: type === 'mousePressed' ? 1 : 0,
          clickCount: 1,
        });
    };
    const KEYCODES = {
      ArrowUp: 38,
      ArrowDown: 40,
      ArrowLeft: 37,
      ArrowRight: 39,
      Enter: 13,
      ' ': 32,
      Escape: 27,
    };
    const keyEvent = (type, key) =>
      send('Input.dispatchKeyEvent', {
        type,
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        windowsVirtualKeyCode: KEYCODES[key] ?? key.toUpperCase().charCodeAt(0),
      });
    const goto = async (r) => {
      await send('Page.navigate', { url: `http://localhost:${s.port}${route(r)}` });
      await sleep(2500); // bundle is cached by `start`; fonts + first frame need a moment
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: false,
    });
    if (!steps.length || !steps[0].startsWith('goto ')) await goto('/');

    for (const step of steps) {
      const [op, ...args] = step.split(' ');
      const arg = args.join(' ');
      console.log(`> ${step}`);
      if (op === 'goto') await goto(arg);
      else if (op === 'click') await click(...arg.split(',').map(Number));
      else if (op === 'drag') {
        // Press at the first point, glide through the rest (8 moves per leg), release at the last.
        const pts = args.map((p) => p.split(',').map(Number));
        const mouse = (type, [x, y], buttons) =>
          send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });
        await mouse('mouseMoved', pts[0], 0);
        await mouse('mousePressed', pts[0], 1);
        for (let i = 1; i < pts.length; i++)
          for (let k = 1; k <= 8; k++) {
            const [ax, ay] = pts[i - 1];
            const [bx, by] = pts[i];
            await mouse('mouseMoved', [ax + ((bx - ax) * k) / 8, ay + ((by - ay) * k) / 8], 1);
            await sleep(16);
          }
        await mouse('mouseReleased', pts.at(-1), 0);
        await sleep(300);
      } else if (op === 'tap') {
        // Popups (e.g. "Got it!" on a new part) animate in after load, so retry for up to 5s.
        const find = () =>
          evaluate(`(() => {
          const want = ${JSON.stringify(arg)};
          const els = [...document.querySelectorAll('body *')].filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && e.innerText?.replace(/\\s+/g, ' ').trim() === want; // pixel UI uses EN SPACES
          });
          els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
          const r = els[0]?.getBoundingClientRect();
          return r ? [r.x + r.width / 2, r.y + r.height / 2] : null;
        })()`);
        let pt = await find();
        for (let t = 0; !pt && t < 25; t++) {
          await sleep(200);
          pt = await find();
        }
        if (!pt) throw new Error(`tap: no visible element with text "${arg}"`);
        await click(...pt);
        await sleep(400);
      } else if (op === 'key') {
        for (let i = 0; i < Number(args[1] ?? 1); i++) {
          await keyEvent('keyDown', args[0]);
          await keyEvent('keyUp', args[0]);
          await sleep(120);
        }
      } else if (op === 'hold') {
        await keyEvent('keyDown', args[0]);
        await sleep(Number(args[1] ?? 500));
        await keyEvent('keyUp', args[0]);
      } else if (op === 'dialog') {
        // Story dialogs block walking. Each line types out letter by letter (a long one takes >3s); only then does the
        // footer show "tap ▼" or, on the last line, "tap to close" (every gap is an EN SPACE, U+2002, so match with \s).
        // The intro pops up a beat after the map draws, so the first wait is at least 4s. After that, give up once
        // the page text has been still for 1.5s with no prompt (dialog closed).
        const prompt = async (firstWait) => {
          let last = '';
          let still = 0;
          for (let t = 0; t < 20_000; t += 200) {
            const text = String(await evaluate('document.body.innerText'));
            if (/tap\s(▼|to\sclose)/.test(text)) return true;
            still = text === last ? still + 200 : 0;
            last = text;
            if (still >= 1500 && t >= firstWait) return false;
            await sleep(200);
          }
          return false;
        };
        let n = 0;
        // Tap the dialog box (what a phone player does). Enter also works, but with no dialog open Enter makes the
        // hero talk to whoever is in front, so a tap is the safer default.
        while (n < 60 && (await prompt(n === 0 ? 4000 : 0))) {
          await click(w / 2, h - 40);
          await sleep(250);
          n++;
        }
        console.log(`  advanced ${n} dialog line(s)`);
      } else if (op === 'wait') await sleep(Number(arg));
      else if (op === 'shot') {
        const out = resolve(stateDir, 'shots', arg || `play-${Date.now()}.png`);
        mkdirSync(dirname(out), { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(out, Buffer.from(data, 'base64'));
        console.log(`  screenshot: ${out}`);
      } else if (op === 'eval') console.log(`  ${JSON.stringify(await evaluate(arg))}`);
      else if (op === 'text')
        console.log(String(await evaluate('document.body.innerText')).replace(/^/gm, '  '));
      else throw new Error(`unknown step "${op}"`);
    }
    if (logs.length) console.log(`page errors/warnings:\n  ${logs.join('\n  ')}`);
    ws.close();
  } finally {
    // Chrome's child processes keep the profile locked for a moment after the main one exits (EPERM on Windows).
    const exited = new Promise((ok) => chrome.once('exit', ok));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch {
      console.log(`(left temp profile ${profile})`);
    }
  }
}

function stop() {
  const s = readState();
  if (!s) return console.log('nothing to stop');
  if (alive(s.pid)) {
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(s.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {
        // already gone
      }
    } else process.kill(-s.pid, 'SIGTERM');
  }
  rmSync(stateFile, { force: true });
  console.log(`stopped server on port ${s.port} (pid ${s.pid})`);
}

const commands = {
  start,
  open,
  shot,
  play,
  stop,
  status: async () => {
    const s = await up();
    console.log(s ? `running: http://localhost:${s.port}  (pid ${s.pid})` : 'not running');
  },
};

if (!commands[cmd]) {
  console.log(
    readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n')
      .slice(0, 15)
      .join('\n'),
  );
} else {
  Promise.resolve()
    .then(commands[cmd])
    .catch((e) => {
      console.error(String(e.message ?? e));
      process.exit(1);
    });
}
