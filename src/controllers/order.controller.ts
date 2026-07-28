import { Request, Response } from "express";

import { OrderService } from "../services/order.service";
import { createOrderSchema } from "../validators/order.schema";

export class OrderController {
  private readonly service = new OrderService();

  // arrow pra preservar o `this`. Erros async sobem pro error-handler (Express 5).
  create = async (req: Request, res: Response): Promise<void> => {
    const input = createOrderSchema.parse(req.body); // ZodError -> error-handler
    const order = await this.service.create(input);
    res.status(201).json(order);
  };
}
