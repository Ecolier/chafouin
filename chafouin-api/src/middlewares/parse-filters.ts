import { NextFunction, Response, Request } from "express";

export type TrainFilters = Partial<{
  name: string;
  type: string;
  seats: boolean;
  available: boolean;
}>;

export default function(req: Request, res: Response, next: NextFunction) {
  const {
    train: name,
    type: type,
    seats,
    available
  } = req.query;
  res.locals.filters = {
    name, type, seats, available
  };
  return next();
}