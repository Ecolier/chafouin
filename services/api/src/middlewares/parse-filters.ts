import { NextFunction, Response, Request } from 'express';

export type TrainFilters = Partial<{
  name: string;
  type: string;
  seats: boolean;
  available: boolean;
}>;

export default function(req: Request, res: Response, next: NextFunction) {
  const {
    name: trainName,
    type: trainType,
    seats: seatCountChanged,
    available: isNewlyAvailable
  } = req.query as { [key: string]: string };
  if (seatCountChanged && typeof seatCountChanged !== 'boolean') {
    return res.status(400).send(`Filter 'seats' must be of type 'boolean'`);
  }
  if (isNewlyAvailable && typeof isNewlyAvailable !== 'boolean') {
    return res.status(400).send(`Filter 'available' must be of type 'boolean'`);
  }
  res.locals.filters = {
    trainName, trainType, seatCountChanged, isNewlyAvailable
  };
  return next();
}