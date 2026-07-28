import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error";

// Middleware de erro central (registrado por último no app).
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "validação falhou", issues: err.issues });
    return;
  }

  // JSON malformado no body (express.json / body-parser)
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "JSON inválido no corpo da requisição" });
    return;
  }

  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ error: err.message, details: err.details });
    return;
  }

  console.error("[error] não tratado:", err);
  res.status(500).json({ error: "erro interno" });
}
