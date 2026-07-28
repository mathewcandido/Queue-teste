import { Queue } from "bullmq";

import { connection } from "../config/redis";

export const orderQueue = new Queue("orders", { connection });
