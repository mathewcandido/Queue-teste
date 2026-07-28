import { prisma } from "../config/prisma";
import { orderQueue } from "../queues/order.queue";

const BATCH = Number(process.env.OUTBOX_BATCH ?? 100);
const POLL_MS = Number(process.env.OUTBOX_POLL_MS ?? 1000);
const STALE_MS = Number(process.env.OUTBOX_STALE_MS ?? 30000);

interface OutboxRow {
  id: number;
  type: string;
  payload: unknown;
}

// Reverte eventos presos em PUBLISHING (relay morreu no meio da publicação).
async function recoverStale(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_MS);
  const r = await prisma.outboxEvent.updateMany({
    where: { status: "PUBLISHING", updatedAt: { lt: cutoff } },
    data: { status: "PENDING" },
  });
  if (r.count > 0) console.log(`[relay] recuperou ${r.count} evento(s) travado(s)`);
}

// Reserva um lote de eventos PENDING de forma atômica.
// FOR UPDATE SKIP LOCKED: várias réplicas de relay pegam lotes diferentes sem colisão.
async function claim(): Promise<OutboxRow[]> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM \`OutboxEvent\` WHERE status='PENDING' ORDER BY id ASC LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    await tx.outboxEvent.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHING" } });
    const events = await tx.outboxEvent.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } });
    return events.map((e) => ({ id: e.id, type: e.type, payload: e.payload }));
  });
}

async function tick(): Promise<void> {
  await recoverStale();
  const events = await claim();

  for (const ev of events) {
    await orderQueue.add(ev.type, ev.payload as Record<string, unknown>, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    await prisma.outboxEvent.update({
      where: { id: ev.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  if (events.length > 0) console.log(`[relay] publicou ${events.length} evento(s)`);
}

let running = true;

export async function startRelay(): Promise<void> {
  console.log(`[relay] on — batch=${BATCH} poll=${POLL_MS}ms stale=${STALE_MS}ms`);
  while (running) {
    try {
      await tick();
    } catch (e) {
      console.error(`[relay] erro no tick: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

export function stopRelay(): void {
  running = false;
}
