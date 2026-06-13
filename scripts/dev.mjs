import { spawn } from "child_process";
import { createServer } from "net";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.PORT) || 3000;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

if (!(await isPortFree(PORT))) {
  console.error(
    `\n  ✖ Port ${PORT} is already in use.\n` +
      `    Stop the other process, then run npm run dev again.\n` +
      `    Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`
  );
  process.exit(1);
}

console.log(`\n  ▲ Next.js dev server → http://localhost:${PORT}\n`);

const child = spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});

child.on("exit", (code) => process.exit(code ?? 0));
