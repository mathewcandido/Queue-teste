import "dotenv/config";
import os from "os";

import { prisma } from "./config/prisma";
import { startRelay, stopRelay } from "./outbox/relay";

console.log(`[boot] relay online host=${os.hostname()} pid=${process.pid}`);

const shutdown = async () => {
  console.log(`[boot] relay ${os.hostname()} desligando...`);
  stopRelay();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startRelay();
