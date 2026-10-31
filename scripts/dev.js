const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LOG_DIR = path.join(ROOT, "output", "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

fs.writeFileSync(path.join(ROOT, "start.log"), new Date().toISOString());


const servers = [
  { name: "backend", cmd: "node",  args: ["server.js"],                    cwd: "backend",      color: "\x1b[33m" },
  { name: "web",     cmd: "npx",   args: ["next", "dev"],                  cwd: "apps/web",     color: "\x1b[36m" },
  { name: "admin",   cmd: "npx",   args: ["next", "dev", "--port", "3001"],cwd: "apps/admin",   color: "\x1b[32m" },
  { name: "doctor",  cmd: "npx",   args: ["next", "dev", "--port", "3002"],cwd: "apps/doctor",  color: "\x1b[35m" },
  { name: "clinic",  cmd: "npx",   args: ["next", "dev", "--port", "3003"],cwd: "apps/clinic",  color: "\x1b[34m" },
  { name: "flows",   cmd: "node",  args: ["server.js"],                    cwd: "flows",        color: "\x1b[37m" },
];

const RESET = "\x1b[0m";
const children = [];

for (const s of servers) {
  const logFile = path.join(LOG_DIR, `${s.name}.output.log`);
  const logStream = fs.createWriteStream(logFile);

  const localLogName = s.name === "backend" || s.name === "flows" ? "server.log" : "frontend.log";
  const localLogFile = path.join(ROOT, s.cwd, localLogName);
  const localLogStream = fs.createWriteStream(localLogFile);

  const prefix = `${s.color}[${s.name}]${RESET} `;

  const child = spawn(s.cmd, s.args, {
    cwd: path.join(ROOT, s.cwd),
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  function handleData(data) {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`${prefix}${line}\n`);
        const clean = line.replace(/\x1b\[[0-9;]*m/g, "");
        logStream.write(`${clean}\n`);
        localLogStream.write(`${clean}\n`);
      }
    }
  }

  child.stdout.on("data", handleData);
  child.stderr.on("data", handleData);
  child.on("exit", (code) => {
    process.stdout.write(`${prefix}exited with code ${code}\n`);
    logStream.end();
    localLogStream.end();
  });

  children.push(child);
}

function cleanup() {
  console.log("\nStopping all servers...");
  for (const child of children) {
    try { child.kill(); } catch {}
  }
  // Force kill on Windows after 2s
  setTimeout(() => {
    for (const child of children) {
      try { child.kill("SIGKILL"); } catch {}
    }
    process.exit(0);
  }, 2000);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
