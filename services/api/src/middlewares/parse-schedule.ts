import { Schedule, logging } from '@chafouin/common';
import provider from '@chafouin/provider';
import { NextFunction, Request, Response } from 'express';
const logger = logging('parse-schedule');

export default function(req: Request, res: Response, next: NextFunction) {
  const {
    outbound: outboundStation, 
    inbound: inboundStation, 
    date: departureDate,
  } = req.query as { [key: string]: string };
  if (!outboundStation || !inboundStation || !departureDate) {
    logger.info('Search query validation failed: parameters are missing from query.');
    return res.status(400).send('Malformed query');
  }
  if (!Object.values(provider.stations).find(stationName => 
    stationName.toUpperCase() === outboundStation.toUpperCase())) {
      logger.info('Search query validation failed: unknown outbound station.');
    return res.status(400).send('Unknown outbound station');
  }
  if (!Object.values(provider.stations).find(stationName => 
    stationName.toUpperCase() === inboundStation.toUpperCase())) {
      logger.info('Search query validation failed: unknown inbound station.');
    return res.status(400).send('Unknown inbound station');
  }
  const parsedDate = new Date(departureDate);
  console.log(parsedDate)
  if (!(parsedDate instanceof Date && !isNaN(+parsedDate))) {
    logger.info('Search query validation failed: invalid departure date.');
    return res.status(400).send('Invalid date');
  }
  res.locals.schedule = new Schedule(
    outboundStation, 
    inboundStation,
    parsedDate
  );
  return next();
}
