const { spawn, spawnSync } = require("node:child_process");
const net = require("node:net");

async function isPortFree(port, host = "127.0.0.1") {
  return await new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => server.close(() => resolve(true)))
      .listen(port, host);
  });
}

async function findFreePort(startPort, { host = "127.0.0.1", maxTries = 50 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    const port = startPort + i;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(`Nenhuma porta livre encontrada a partir de ${startPort} (tentativas: ${maxTries}).`);
}

function freePort(port) {
  if (process.platform === "win32") {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `$p = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }`
      ],
      { stdio: "ignore", shell: false }
    );
    return;
  }
  spawnSync("sh", ["-c", `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`], {
    stdio: "ignore"
  });
}

function run(cmd, args, env) {
  const child = spawn(cmd, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });

  return child;
}

async function main() {
  const preferredApiPort = Number(process.env.API_PORT || 4000);
  const preferredWebPort = Number(process.env.WEB_PORT || 3000);
  freePort(preferredApiPort);
  freePort(preferredWebPort);
  const apiPort = await findFreePort(preferredApiPort);
  const webPort = await findFreePort(preferredWebPort);
  const apiUrl = `http://localhost:${apiPort}`;

  console.log(`[dev] API_PORT=${apiPort}`);
  console.log(`[dev] WEB_PORT=${webPort}`);
  console.log(`[dev] NEXT_PUBLIC_API_URL=${apiUrl}`);

  console.log("[dev] Compilando API...");
  try {
    require("fs").unlinkSync(require("path").join(__dirname, "../apps/api/tsconfig.tsbuildinfo"));
  } catch {
    // ignore
  }
  const build = spawnSync("npm", ["run", "build", "-w", "@flowos/api"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, PORT: String(apiPort) }
  });
  if (build.status !== 0) process.exit(build.status ?? 1);

  // Re-libera a porta apos o build (evita EADDRINUSE se outra API ficou na 4000)
  freePort(apiPort);
  await new Promise((r) => setTimeout(r, 400));

  run("npm", ["run", "start:dev", "-w", "@flowos/api"], { PORT: String(apiPort) });

  run("npm", ["run", "dev", "-w", "@flowos/web"], {
    WEB_PORT: String(webPort),
    NEXT_PUBLIC_API_URL: apiUrl
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
