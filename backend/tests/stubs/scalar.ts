import type { RequestHandler } from "express";

export const apiReference = (): RequestHandler => (_req, _res, next) => next();