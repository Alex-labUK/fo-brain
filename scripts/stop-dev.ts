import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { platform } from "os";

function killPort(port: number) {
  if (platform() !== "win32") {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "inherit" });
    } catch {
      // Port already free.
    }
    return;
  }

  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set<string>();

    for (const line of result.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;
      const parts = trimmed.split(/\s+/);
      const pid = parts.at(-1);
      if (pid && pid !== "0") pids.add(pid);
    }

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
      console.log(`Stopped process ${pid} on port ${port}`);
    }
  } catch {
    // Port already free.
  }
}

for (const port of [3000, 3001]) {
  killPort(port);
}

const lockPath = join(process.cwd(), ".next", "dev", "lock");
if (existsSync(lockPath)) {
  rmSync(lockPath);
  console.log("Removed stale Next.js dev lock");
}

console.log("Dev server stopped. Run: npm run dev");
