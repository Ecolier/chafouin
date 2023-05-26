import { NextFunction, Response, Request } from "express";

export type TripFilters = Partial<{
  trainId: string;
  trainType: string;
  freeSeatCountUpdated: boolean;
  isNewlyAvailable: boolean;
}>;

export default function(req: Request, res: Response, next: NextFunction) {
  const {
    train: trainId,
    type: trainType,
    seats: freeSeatCountUpdated,
    available: isNewlyAvailable
  } = req.query;
  res.locals.filters = {
    ...res.locals,
    trainId, trainType, freeSeatCountUpdated, isNewlyAvailable
  };
  return next();
}