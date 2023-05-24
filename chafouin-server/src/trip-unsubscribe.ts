import { Router } from 'express';
import { validateTripRequest } from './trip-request-validate.js';
import { TripObserver } from './trip-observer.js';
import winston from 'winston';

export const unSubscribeTripRouter = (tripObserver: TripObserver, validStations: string[]) => 
Router().get('/unsubscribe', 
validateTripRequest(validStations),
async (req, res) => {
  const query = res.locals.tripSchedule;
  const clientId = (req.query as any).channel;
  tripObserver.removeClient(query, clientId);
  return res.sendStatus(200);
});