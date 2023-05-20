import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import winston from 'winston';
import * as uzrailways from "./uzrailways";
import { TripObserver } from './trip-observer';
import { subscribeTripRouter } from './trip-subscribe';
import { searchTripRouter } from './trip-search';

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

const tripObserver = new TripObserver(uzrailways.findTripsByDay);

const app = express();
app.use(subscribeTripRouter(tripObserver, uzrailways.availableStations));
app.use(searchTripRouter(uzrailways.availableStations, uzrailways.findTripsByDay));

app.listen(8080, () => {
  winston.info('Service chafouin-server is running on port 8080.');
});