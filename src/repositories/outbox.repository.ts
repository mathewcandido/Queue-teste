import { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

type Db = Prisma.TransactionClient;

export interface OutboxInput {
  type: string;
  payload: Prisma.InputJsonValue;
}

export class OutboxRepository {
  // gravado dentro da transação do pedido (db = tx)
  add(event: OutboxInput, db: Db = prisma) {
    return db.outboxEvent.create({
      data: { type: event.type, payload: event.payload, status: "PENDING" },
    });
  }
}
