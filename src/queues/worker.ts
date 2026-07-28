import os from "os";

import { Worker, QueueEvents } from "bullmq";

import { connection } from "../config/redis";
import { OrderService } from "../services/order.service";

const VERBOSE = process.env.VERBOSE === "1";
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);
const STEP_MS = Number(process.env.PROC_STEP_MS ?? 250);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const steps = ["pagamento", "estoque", "cozinha", "notificacao"] as const;

const service = new OrderService();

export const orderWorker = new Worker(
  "orders",
  async (job) => {
    const orderId = job.data.orderId as number;

    // simula o trabalho pesado (cada etapa) -- apenas para demonstração. Na vida real, cada etapa seria um job separado (ou microserviço).
    for (let i = 0; i < steps.length; i++) {
      await sleep(STEP_MS);
      await job.updateProgress(Math.round(((i + 1) / steps.length) * 100));
      if (VERBOSE)
        console.log(
          `[proc]   order=${orderId} step=${steps[i]} (${i + 1}/${steps.length})`,
        );
    }

    const order = await service.process(orderId, os.hostname());
    if (VERBOSE)
      console.log(
        `[proc]   order=${orderId} ${order.status} by=${os.hostname()}`,
      );
    return { orderId, status: order.status };
  },
  { connection, concurrency },
);

// falhas sempre logam (BullMQ faz o retry conforme attempts)
orderWorker.on("failed", (job, err) => {
  console.error(
    `[worker] failed job=${job?.id} order=${job?.data?.orderId} tentativa=${job?.attemptsMade} err=${err.message}`,
  );
});

if (VERBOSE) {
  const events = new QueueEvents("orders", { connection });
  events.on("completed", ({ jobId }) =>
    console.log(`[queue]  completed job=${jobId}`),
  );

  events.on("failed", ({ jobId, failedReason }) =>
    console.error(`[queue]  failed job=${jobId} ${failedReason}`),
  );
}
