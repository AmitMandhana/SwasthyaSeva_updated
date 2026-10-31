#!/usr/bin/env node
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");

const ROOT = path.join(__dirname, "..");
const LOG_DIR = path.join(ROOT, "output", "logs");

const SERVERS = [
  { name: "backend", port: 5000, cmd: "node",  args: ["server.js"],                     cwd: "backend",    color: "\x1b[33m" },
  { name: "web",     port: 3000, cmd: "npx",   args: ["next", "dev"],                   cwd: "apps/web",   color: "\x1b[36m" },
  { name: "admin",   port: 3001, cmd: "npx",   args: ["next", "dev", "--port", "3001"], cwd: "apps/admin", color: "\x1b[32m" },
  { name: "doctor",  port: 3002, cmd: "npx",   args: ["next", "dev", "--port", "3002"], cwd: "apps/doctor",color: "\x1b[35m" },
  { name: "clinic",  port: 3003, cmd: "npx",   args: ["next", "dev", "--port", "3003"], cwd: "apps/clinic",color: "\x1b[34m" },
  { name: "flows",   port: 4001, cmd: "node",  args: ["server.js"],                     cwd: "flows",      color: "\x1b[37m" },
];

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => { server.close(); resolve(false); });
    server.listen(port, "127.0.0.1");
  });
}

async function getRunningServers() {
  const running = [];
  for (const s of SERVERS) {
    if (await checkPort(s.port)) {
      running.push(s);
    }
  }
  return running;
}

function stopServers() {
  console.log(`${YELLOW}Stopping all servers...${RESET}`);
  for (const s of SERVERS) {
    try {
      const result = execSync(
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr ":${s.port} " ^| findstr LISTENING') do @echo %a`,
        { shell: "cmd.exe", encoding: "utf8" }
      ).trim();
      const pids = result.split("\n").map(p => p.trim()).filter(Boolean);
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { shell: "cmd.exe", stdio: "ignore" });
        } catch {}
      }
      if (pids.length > 0) {
        console.log(`  ${s.color}[${s.name}]${RESET} stopped (port ${s.port})`);
      }
    } catch {}
  }
  console.log(`${GREEN}All servers stopped.${RESET}`);
}

async function startServers() {
  const running = await getRunningServers();
  if (running.length > 0) {
    console.log(`${RED}${BOLD}Error: Some servers are already running:${RESET}`);
    for (const s of running) {
      console.log(`  ${s.color}[${s.name}]${RESET} → port ${s.port}`);
    }
    console.log(`\nRun ${BOLD}swasthyaseva stop${RESET} first, or ${BOLD}swasthyaseva restart${RESET}.`);
    process.exit(1);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`${GREEN}${BOLD}Starting all servers...${RESET}\n`);

  const children = [];

  for (const s of SERVERS) {
    const centralLog = path.join(LOG_DIR, `${s.name}.output.log`);
    const centralStream = fs.createWriteStream(centralLog);

    const localLogName = s.name === "backend" || s.name === "flows" ? "server.log" : "frontend.log";
    const localLog = path.join(ROOT, s.cwd, localLogName);
    const localStream = fs.createWriteStream(localLog);

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
          centralStream.write(`${line}\n`);
          localStream.write(`${line}\n`);
        }
      }
    }

    child.stdout.on("data", handleData);
    child.stderr.on("data", handleData);
    child.on("exit", (code) => {
      process.stdout.write(`${prefix}exited with code ${code}\n`);
      centralStream.end();
      localStream.end();
    });

    children.push(child);
  }

  function cleanup() {
    console.log(`\n${YELLOW}Stopping all servers...${RESET}`);
    for (const child of children) {
      try { child.kill(); } catch {}
    }
    setTimeout(() => {
      for (const child of children) {
        try { child.kill("SIGKILL"); } catch {}
      }
      process.exit(0);
    }, 2000);
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

async function statusServers() {
  const running = await getRunningServers();
  if (running.length === 0) {
    console.log(`${YELLOW}No servers running.${RESET}`);
  } else {
    console.log(`${GREEN}${BOLD}Running servers:${RESET}`);
    for (const s of running) {
      console.log(`  ${s.color}[${s.name}]${RESET} → port ${s.port}`);
    }
    const stopped = SERVERS.filter(s => !running.includes(s));
    if (stopped.length > 0) {
      console.log(`${RED}Stopped:${RESET}`);
      for (const s of stopped) {
        console.log(`  ${s.color}[${s.name}]${RESET} → port ${s.port}`);
      }
    }
  }
}

// ── CLI ──

const command = process.argv[2];

switch (command) {
  case "start":
    startServers();
    break;
  case "stop":
    stopServers();
    break;
  case "restart":
    stopServers();
    setTimeout(() => startServers(), 1500);
    break;
  case "status":
    statusServers();
    break;
  default:
    console.log(`${BOLD}SwasthyaSeva CLI${RESET}\n`);
    console.log("Usage:");
    console.log(`  swasthyaseva start    Start all dev servers`);
    console.log(`  swasthyaseva stop     Stop all dev servers`);
    console.log(`  swasthyaseva restart  Stop then start all servers`);
    console.log(`  swasthyaseva status   Show which servers are running`);
    process.exit(command ? 1 : 0);
}
