import { Router } from 'express';
import { Trip } from './trip';
import { filterTrips, parseTripFilters } from './trip-filter';
import { validateTripRequest } from './trip-request-validate';
import { TripObserver } from './trip-observer';

export const subscribeTripRouter = (tripObserver: TripObserver, validStations: string[]) => 
Router().get('/subscribe', 
validateTripRequest(validStations),
parseTripFilters,
async (req, res) => {
  const query = res.locals.tripQuery;
  const filters = res.locals.tripFilters;

  const clientId = tripObserver.addClient(query, (updatedTrips: Trip[], outdatedTrips: Trip[]) => {
    const filteredTrips = filterTrips(updatedTrips, outdatedTrips, filters);
    if (filteredTrips.length === 0) {
      return;
    }
    return res.write(`${JSON.stringify({
      date: new Date().toLocaleString('fr-FR'),
      update: filteredTrips,
    })}\n\n`);
  });
  
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive'
  });
  
  res.on('close', () => {
    tripObserver.removeClient(query, clientId);
  });
  
  res.flushHeaders();
});