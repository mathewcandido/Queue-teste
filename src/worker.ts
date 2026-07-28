import "dotenv/config";
import os from "os";

import { orderWorker } from "./queues/worker";

console.log(`[boot] worker online host=${os.hostname()} pid=${process.pid}`);

const shutdown = async () => {
  console.log(`[boot] worker ${os.hostname()} desligando...`);
  await orderWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
