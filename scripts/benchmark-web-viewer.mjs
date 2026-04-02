import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean);
const DEFAULT_VIEWPORT = {
  height: 2200,
  width: 1440,
};
const DEFAULT_WAIT_MS = 5000;
const DEFAULT_SCROLL_TREE = true;

async function main() {
  const { options, urls } = parseArgs(process.argv.slice(2));
  if (urls.length === 0) {
    printUsage();
    process.exit(1);
  }

  const chromePath = DEFAULT_CHROME_PATHS[0];
  if (!chromePath) {
    throw new Error("Could not determine a Chrome executable path. Set CHROME_PATH and try again.");
  }

  const port = options.port ?? (await findAvailablePort());
  const profileDir = mkdtempSync(join(tmpdir(), "pob-codes-benchmark-"));
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    {
      stdio: "ignore",
    },
  );

  try {
    const version = await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const browser = await connectToBrowser(version.webSocketDebuggerUrl);
    const results = [];

    for (const url of urls) {
      results.push(await benchmarkUrl(browser, url, options));
    }

    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  } finally {
    chrome.kill("SIGKILL");
    await onceExit(chrome).catch(() => {});
    rmSync(profileDir, { force: true, recursive: true });
  }
}

async function benchmarkUrl(browser, url, options) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { flatten: true, targetId });
  const page = browser.session(sessionId);

  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Performance.enable");
  await page.send("Network.enable");
  await page.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: options.viewport.height,
    mobile: false,
    width: options.viewport.width,
  });

  const loadEvent = oncePageLoad(page);
  await page.send("Page.navigate", { url });
  await loadEvent;
  await delay(options.waitMs);

  if (options.scrollTree) {
    await page.send("Runtime.evaluate", {
      expression: `document.querySelector('.tree-panel')?.scrollIntoView({ block: 'center' })`,
      returnByValue: true,
    });
    await delay(1500);
  }

  const metrics = metricEntriesToObject(await page.send("Performance.getMetrics"));
  const { result } = await page.send("Runtime.evaluate", {
    expression: `(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]));
      const resources = performance.getEntriesByType('resource');
      return {
        counts: {
          elements: document.querySelectorAll('*').length,
          images: document.images.length,
          itemTooltips: document.querySelectorAll('.gear-tooltip-panel .poe-tooltip').length,
          gemTooltips: document.querySelectorAll('.gem-tooltip-panel .poe-tooltip').length,
          treeCircles: document.querySelectorAll('.tree-canvas circle').length,
          treeLinks: document.querySelectorAll('.tree-link').length,
          treeNodes: document.querySelectorAll('.tree-node').length,
        },
        navigation: navigation ? {
          decodedBodySize: navigation.decodedBodySize,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          encodedBodySize: navigation.encodedBodySize,
          loadEventEnd: navigation.loadEventEnd,
          responseEnd: navigation.responseEnd,
          transferSize: navigation.transferSize,
        } : null,
        paints,
        resourceCount: resources.length,
        title: document.title,
        totalResourceTransfer: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        treeLoaded: Boolean(document.querySelector('.tree-canvas')),
        treePlaceholder: document.querySelector('.tree-placeholder')?.textContent?.trim() ?? null,
      };
    })()`,
    returnByValue: true,
  });

  await browser.send("Target.closeTarget", { targetId });

  return {
    counts: result.value.counts,
    metrics: {
      jsEventListeners: metrics.JSEventListeners,
      layoutCount: metrics.LayoutCount,
      layoutDuration: metrics.LayoutDuration,
      nodes: metrics.Nodes,
      recalcStyleDuration: metrics.RecalcStyleDuration,
      scriptDuration: metrics.ScriptDuration,
      taskDuration: metrics.TaskDuration,
    },
    navigation: result.value.navigation,
    paints: result.value.paints,
    resourceCount: result.value.resourceCount,
    title: result.value.title,
    totalResourceTransfer: result.value.totalResourceTransfer,
    treeLoaded: result.value.treeLoaded,
    treePlaceholder: result.value.treePlaceholder,
    url,
  };
}

function oncePageLoad(page) {
  return new Promise((resolve) => {
    const onLoad = () => {
      page.off?.("Page.loadEventFired", onLoad);
      resolve();
    };
    page.on("Page.loadEventFired", onLoad);
  });
}

function metricEntriesToObject(payload) {
  return Object.fromEntries(payload.metrics.map((entry) => [entry.name, entry.value]));
}

function parseArgs(args) {
  const options = {
    port: undefined,
    scrollTree: DEFAULT_SCROLL_TREE,
    viewport: { ...DEFAULT_VIEWPORT },
    waitMs: DEFAULT_WAIT_MS,
  };
  const urls = [];

  for (const arg of args) {
    if (arg === "--no-scroll-tree") {
      options.scrollTree = false;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = Number(arg.slice("--port=".length));
      continue;
    }
    if (arg.startsWith("--wait-ms=")) {
      options.waitMs = Number(arg.slice("--wait-ms=".length));
      continue;
    }
    if (arg.startsWith("--viewport=")) {
      const [width, height] = arg
        .slice("--viewport=".length)
        .toLowerCase()
        .split("x")
        .map((value) => Number(value.trim()));
      if (Number.isFinite(width) && Number.isFinite(height)) {
        options.viewport = { height, width };
      }
      continue;
    }
    urls.push(arg);
  }

  return { options, urls };
}

function printUsage() {
  console.error("Usage: node scripts/benchmark-web-viewer.mjs [--port=9333] [--wait-ms=5000] [--viewport=1440x2200] [--no-scroll-tree] <url> [url...]");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceExit(proc) {
  return new Promise((resolve) => proc.once("exit", resolve));
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine an available local port.")));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

function waitForJson(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    const tryOnce = (remaining) => {
      http
        .get(url, (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            if (response.statusCode === 200) {
              resolve(JSON.parse(body));
              return;
            }

            if (remaining > 0) {
              setTimeout(() => tryOnce(remaining - 1), 250);
              return;
            }

            reject(new Error(`Chrome remote debugging endpoint returned ${response.statusCode}.`));
          });
        })
        .on("error", (error) => {
          if (remaining > 0) {
            setTimeout(() => tryOnce(remaining - 1), 250);
            return;
          }

          reject(error);
        });
    };

    tryOnce(attempts);
  });
}

async function connectToBrowser(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = () => resolve();
    socket.onerror = reject;
  });

  let nextId = 0;
  const listeners = new Map();
  const pending = new Map();

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data.toString());
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) {
        return;
      }

      pending.delete(message.id);
      if (message.error) {
        entry.reject(new Error(message.error.message));
      } else {
        entry.resolve(message.result);
      }
      return;
    }

    const key = `${message.sessionId || ""}:${message.method}`;
    for (const handler of listeners.get(key) || []) {
      handler(message.params || {});
    }
  };

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { reject, resolve });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });

  return {
    close() {
      socket.close();
      return Promise.resolve();
    },
    send,
    session(sessionId) {
      return {
        off(method, handler) {
          const key = `${sessionId}:${method}`;
          const set = listeners.get(key);
          set?.delete(handler);
        },
        on(method, handler) {
          const key = `${sessionId}:${method}`;
          const set = listeners.get(key) || new Set();
          set.add(handler);
          listeners.set(key, set);
        },
        send(method, params = {}) {
          return send(method, params, sessionId);
        },
      };
    },
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
