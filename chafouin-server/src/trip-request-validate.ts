import { NextFunction, Response } from "express";
import { TripRequest } from "./trip-request.js";
import { TripQuery } from "../../chafouin-shared/trip-query.js";
import winston from "winston";

export const validateTripRequest = (validStations: string[]) =>
(req: TripRequest, res: Response, next: NextFunction) => {
  const {
    outbound: outboundStation, 
    inbound: inboundStation, 
    date: departureDate,
  } = req.query;
  if (!outboundStation || !inboundStation || !departureDate) {
    winston.info('Search query validation failed: parameters are missing from query.');
    return res.status(400).send('Malformed query');
  }
  if (!validStations.find(stationName => 
    stationName.toUpperCase() === outboundStation.toUpperCase())) {
      winston.info('Search query validation failed: unknown outbound station.');
    return res.status(400).send('Unknown outbound station');
  }
  if (!validStations.find(stationName => 
    stationName.toUpperCase() === inboundStation.toUpperCase())) {
      winston.info('Search query validation failed: unknown inbound station.');
    return res.status(400).send('Unknown inbound station');
  }
  const parsedDate = new Date(departureDate);
  if (!(parsedDate instanceof Date && !isNaN(+parsedDate))) {
    winston.info('Search query validation failed: invalid departure date.');
    return res.status(400).send('Invalid date');
  }
  res.locals.tripQuery = {
    outboundStation, 
    inboundStation,
    departureDate: parsedDate.toDateString(),
  } as TripQuery;
  
  return next();
}