import broadcast from './broadcast.js';
import uzrailways from './uzrailways.js';
import createTripWorker, { TripWorker } from './trip-worker.js'
import { TripSchedule } from 'chafouin-shared';

export default broadcast<[TripSchedule], TripWorker>((workerId) => 
  createTripWorker(workerId, uzrailways.fetchTrips)
);