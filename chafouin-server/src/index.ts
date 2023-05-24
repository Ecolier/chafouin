import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import winston from 'winston';

import { UZRWTripProvider } from "./uzrailways-provider.js";
import { TripObserver } from './trip-observer.js';
import { subscribeTripRouter } from './trip-subscribe.js';
import { searchTripRouter } from './trip-search.js';
import { unSubscribeTripRouter } from './trip-unsubscribe.js';

winston.configure({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  winston.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const tripProvider = new UZRWTripProvider();
const tripObserver = new TripObserver(tripProvider);

const app = express();
app.use(subscribeTripRouter(tripObserver, tripProvider.availableStations));
app.use(unSubscribeTripRouter(tripObserver, tripProvider.availableStations));
app.use(searchTripRouter(tripProvider.availableStations, tripProvider.fetchTrips));

app.listen(8080, () => {
  winston.info('Service chafouin-server is running on port 8080.');
});