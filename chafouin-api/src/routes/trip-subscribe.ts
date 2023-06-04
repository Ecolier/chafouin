import { Router } from 'express';
import { Schedule, Trips } from 'chafouin-shared';
import tripBroadcast from '../trip-broadcast.js';
import parseSchedule from '../middlewares/parse-schedule.js';
import parseFilters, { TrainFilters } from '../middlewares/parse-filters.js';
import filterTrips from '../filter-trips.js';

import logging from '../utils/logging.js';
const logger = logging('subscribe');

const router = Router();
router.get('/subscribe', 
parseFilters,
parseSchedule,
async (req, res) => {
  const schedule = res.locals.schedule as Schedule;
  const filters = res.locals.filters as TrainFilters;
  const channelRequest = req.query.channel as string;

  const path = schedule.toPath();
  const worker = await tripBroadcast.subscribe(path);
  const [channelId, channel] = worker.start(channelRequest, schedule);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write('event: channel\ndata: ' + channelId + '\n\n');

  channel.onDestroy(() => {
    res.write('event: close\ndata: close\n\n');
  });

  res.on('close', () => {
    logger.info(`closed stream ${channelId} for ${path}`);
  });

  channel.data(([trips]) => {
    const filteredTrips = filterTrips(trips, filters);
    if (filteredTrips.trains.length === 0) {
      return;
    }
    res.write('event: update\ndata: ' + JSON.stringify(filteredTrips) + '\n\n');
  });

});
export default router;