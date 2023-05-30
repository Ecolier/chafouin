import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';

import alertSubscribe from './routes/trip-subscribe.js';
import alertUnsubscribe from './routes/trip-unsubscribe.js';
import searchTrips from './routes/trip-search.js';

import logging from './utils/logging.js';
const logger = logging('server');

const app = express();
app.use(alertSubscribe);
app.use(alertUnsubscribe);
app.use(searchTrips);

app.listen(8080, () => {
  logger.info('Running on port 8080');
});