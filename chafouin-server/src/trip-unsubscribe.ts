import { Router } from 'express';
import { validateTripRequest } from './trip-request-validate.js';
import { TripObserver } from './trip-observer.js';

export const unSubscribeTripRouter = (tripObserver: TripObserver, validStations: string[]) => 
Router().get('/unsubscribe', 
validateTripRequest(validStations),
async (req, res) => {
  const query = res.locals.tripSchedule;
});