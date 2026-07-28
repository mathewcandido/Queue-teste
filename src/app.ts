import express from "express";

import { OrderController } from "./controllers/order.controller";
import { errorHandler } from "./middlewares/error-handler";

export const app = express();

app.use(express.json());

const orderController = new OrderController();

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/orders", orderController.create);

app.use(errorHandler); // por último
