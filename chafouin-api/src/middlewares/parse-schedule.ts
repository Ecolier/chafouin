import { NextFunction, Request, Response } from "express";
import { TripSchedule } from 'chafouin-shared';
import winston from "winston";
import uzrailways from "../uzrailways.js";

export default function(req: Request, res: Response, next: NextFunction) {
  const {
    outbound: outboundStation, 
    inbound: inboundStation, 
    date: departureDate,
  } = req.query as {[key: string]: string};
  if (!outboundStation || !inboundStation || !departureDate) {
    winston.info('Search query validation failed: parameters are missing from query.');
    return res.status(400).send('Malformed query');
  }
  if (!uzrailways.stations.find(stationName => 
    stationName.toUpperCase() === outboundStation.toUpperCase())) {
      winston.info('Search query validation failed: unknown outbound station.');
    return res.status(400).send('Unknown outbound station');
  }
  if (!uzrailways.stations.find(stationName => 
    stationName.toUpperCase() === inboundStation.toUpperCase())) {
      winston.info('Search query validation failed: unknown inbound station.');
    return res.status(400).send('Unknown inbound station');
  }
  const parsedDate = new Date(departureDate);
  if (!(parsedDate instanceof Date && !isNaN(+parsedDate))) {
    winston.info('Search query validation failed: invalid departure date.');
    return res.status(400).send('Invalid date');
  }
  res.locals.schedule = {
    ...res.locals,
    outboundStation, 
    inboundStation,
    departureDate: parsedDate.toISOString().substring(0, 10),
  } as TripSchedule;
  return next();
}
