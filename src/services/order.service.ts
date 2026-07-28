import { prisma } from "../config/prisma";
import { OrderRepository } from "../repositories/order.repository";
import { OutboxRepository } from "../repositories/outbox.repository";
import { NotFoundError } from "../errors/app-error";
import type { CreateOrderInput } from "../validators/order.schema";

export class OrderService {
  private readonly orders = new OrderRepository();
  private readonly outbox = new OutboxRepository();

  async create(data: CreateOrderInput) {
    // Transactional Outbox: pedido + evento na MESMA transação.
    // Se qualquer um falhar, ambos revertem. Não existe "pedido sem evento".
    // O relay publica o evento na fila depois — desacoplado e à prova de falha.
    const order = await prisma.$transaction(async (tx) => {
      const created = await this.orders.create(data, tx);
      await this.outbox.add(
        {
          type: "process-order",
          payload: { tenantId: created.tenantId, orderId: created.id },
        },
        tx,
      );
      return created;
    });

    console.log(`[api] order=${order.id} criado (outbox PENDING)`);
    return order;
  }

  async process(orderId: number, processedBy: string) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError(`pedido ${orderId} não encontrado`);

    // idempotente: job reprocessado (retry) num pedido já finalizado não falha.
    if (order.status === "FINISHED") return order;

    return this.orders.markProcessed(orderId, processedBy);
  }
}
