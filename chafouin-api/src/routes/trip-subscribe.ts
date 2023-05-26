import { Router } from 'express';
import { TripSchedule, TripUpdate } from 'chafouin-shared';
import tripBroadcast from '../trip-broadcast.js';
import parseSchedule from '../middlewares/parse-schedule.js';
import parseFilters, { TripFilters } from '../middlewares/parse-filters.js';
import filterTrips from '../filter-trips.js';

import logging from '../logging.js';
const logger = logging('subscribe');

const router = Router();
router.get('/subscribe', 
parseFilters,
parseSchedule,
async (req, res) => {
  const querySchedule = res.locals.schedule as TripSchedule;
  const queryFilters = res.locals.filters as TripFilters;
  const queryChannelId = req.query.channel as string;

  const path = `${querySchedule.outboundStation}_${querySchedule.inboundStation}_${querySchedule.departureDate.toString()}`;

  tripBroadcast.startWorker((workerId, worker) => {
    logger.info(`Start worker ${workerId}`);
    worker.start(querySchedule);
  });

  const [worker, channelId] = tripBroadcast.subscribe(
    path,
    queryChannelId
  );

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write('event: channel\ndata: ' + channelId + '\n\n');

  tripBroadcast.disconnect((channelId) => {
    if (queryChannelId === channelId) {
      return res.end();
    }
  });

  worker.update((updatedTrips: TripUpdate[]) => {
    console.log(worker, updatedTrips, queryFilters)
    const filteredTrips = filterTrips(updatedTrips, queryFilters);
    if (filteredTrips.length === 0) {
      return;
    }
    res.write('event: update\ndata: ' + JSON.stringify(filteredTrips) + '\n\n');
  });
});
export default router;