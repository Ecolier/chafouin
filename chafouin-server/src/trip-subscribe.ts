import { Router } from 'express';
import { Trip, TripUpdate } from '../../chafouin-shared/trip.js';
import { filterTrips, parseTripFilters } from './trip-filter.js';
import { validateTripRequest } from './trip-request-validate.js';
import { TripObserver } from './trip-observer.js';

export const subscribeTripRouter = (tripObserver: TripObserver, validStations: string[]) => 
Router().get('/subscribe', 
validateTripRequest(validStations),
parseTripFilters,
async (req, res) => {
  const query = res.locals.tripQuery;
  const filters = res.locals.tripFilters;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  const clientId = tripObserver.addClient(query, (updatedTrips: TripUpdate[]) => {
    const filteredTrips = filterTrips(updatedTrips, filters);
    if (filteredTrips.length === 0) {
      return;
    }
    res.write('event: update\ndata: ' + JSON.stringify(filteredTrips) + '\n\n');
  });
  
  res.on('close', () => {
    tripObserver.removeClient(query, clientId);
    res.end();
  });
});