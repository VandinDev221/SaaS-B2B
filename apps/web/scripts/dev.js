const { spawn } = require("node:child_process");
const fs = require("node:fs");

function rmNext() {
  try {
    fs.rmSync(".next", { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function main() {
  rmNext();

  const port = Number(process.env.WEB_PORT || 3000);

  const child = spawn(
    "next",
    ["dev", "-p", String(port)],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env
    }
  );

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();

