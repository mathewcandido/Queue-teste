import "dotenv/config";
import { execSync } from "child_process";

import { Queue } from "bullmq";

import { connection } from "../src/config/redis";

// Autoscaler dinamico: ajusta replicas pelo backlog da fila.
// desired = clamp(ceil(backlog / STEP), MIN, MAX)
// backlog = waiting + active. Sobe sob carga, desce quando drena.
const SERVICE = "queue_worker";
const STEP = Number(process.env.SCALE_STEP ?? 100); // jobs de backlog por replica
const MIN = Number(process.env.SCALE_MIN ?? 1);
const MAX = Number(process.env.SCALE_MAX ?? 10);
const POLL_MS = Number(process.env.SCALE_POLL_MS ?? 2000);

const q = new Queue("orders", { connection });

let current = -1; // desconhecido no start -> força primeiro ajuste

const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));

console.log(`[scaler] on — 1 replica a cada ${STEP} de backlog (min ${MIN}, max ${MAX})`);

setInterval(async () => {
  const c = await q.getJobCounts("completed", "active", "waiting", "failed");
  const backlog = (c.waiting ?? 0) + (c.active ?? 0);
  const desired = clamp(Math.ceil(backlog / STEP));

  console.log(
    `[scaler] backlog=${backlog} (waiting=${c.waiting} active=${c.active}) completed=${c.completed} failed=${c.failed} replicas=${current < 0 ? "?" : current} -> desired=${desired}`,
  );

  if (desired !== current) {
    try {
      execSync(`docker service scale --detach ${SERVICE}=${desired}`, { stdio: "inherit" });
      const dir = desired > current ? "UP" : "DOWN";
      console.log(`[scaler] >>> ${dir} ${current < 0 ? MIN : current} -> ${desired} replicas`);
      current = desired;
    } catch (e) {
      console.error(`[scaler] scale falhou: ${(e as Error).message}`);
    }
  }
}, POLL_MS);
