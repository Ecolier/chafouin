import broadcast from './utils/broadcast.js';
import uzrailways from './uzrailways.js';
import createTripWorker from './trip-worker.js'
import { Schedule, Trips } from 'chafouin-shared';

export default broadcast<[Schedule], [Trips]>((workerId) => 
  createTripWorker(workerId, uzrailways.fetchTrips)
);