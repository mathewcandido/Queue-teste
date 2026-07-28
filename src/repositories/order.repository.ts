import { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import type { CreateOrderInput } from "../validators/order.schema";

// aceita o client global ou um client de transação (tx)
type Db = Prisma.TransactionClient;

// Acesso a dados — isola o Prisma do restante da aplicação.
export class OrderRepository {
  create(data: CreateOrderInput, db: Db = prisma) {
    return db.order.create({
      data: {
        tenantId: data.tenantId,
        customer: data.customer,
        total: data.total,
        status: "PENDING",
      },
    });
  }

  findById(id: number) {
    return prisma.order.findUnique({ where: { id } });
  }

  markProcessed(id: number, processedBy: string) {
    return prisma.order.update({
      where: { id },
      data: { status: "FINISHED", processedBy },
    });
  }
}
