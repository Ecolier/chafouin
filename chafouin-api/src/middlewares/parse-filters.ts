import { NextFunction, Response, Request } from "express";

export type TrainFilters = Partial<{
  name: string;
  type: string;
  changed: boolean;
  available: boolean;
}>;

export default function(req: Request, res: Response, next: NextFunction) {
  const {
    train: name,
    type: type,
    changed,
    available
  } = req.query;
  res.locals.filters = {
    name, type, changed, available
  };
  return next();
}