import { Router } from 'express';
import { Trip, TripUpdate, tripScheduleEquals } from 'chafouin-shared';
import { filterTrips, parseTripFilters } from './trip-filter.js';
import { validateTripRequest } from './trip-request-validate.js';
import { TripObserver } from './trip-observer.js';
import winston from 'winston';

export const subscribeTripRouter = (tripObserver: TripObserver, validStations: string[]) => 
Router().get('/subscribe', 
validateTripRequest(validStations),
parseTripFilters,
async (req, res) => {
  const query = res.locals.tripSchedule;
  const filters = res.locals.tripFilters;

  const channel = (req.query as any).channel;

  console.log(channel)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  const clientId = tripObserver.addClient(query, channel);
  res.write('event: channel\ndata: ' + clientId + '\n\n');

  tripObserver.onTripUpdate(query, clientId, (updatedTrips: TripUpdate[]) => {
    const filteredTrips = filterTrips(updatedTrips, filters);
    if (filteredTrips.length === 0) {
      return;
    }
    res.write('event: update\ndata: ' + JSON.stringify(filteredTrips) + '\n\n');
  });

  tripObserver.onRemoveClient((sch, channel) => {
    if (tripScheduleEquals(query, sch) && channel === clientId) {
      winston.info(`${sch.outboundStation} - ${sch.inboundStation} (${sch.departureDate}) Removing channel ${channel}`)
      return res.end();
    } 
  });
});