import { Schedule, Trips } from '@chafouin/common';
import railwaysProvider from '@chafouin/provider';
import broadcast from './utils/broadcast.js';
import createTripWorker from './trip-worker.js'

export default broadcast<[Schedule], [Trips]>((workerId) =>
  createTripWorker(workerId, (schedule, agent) => 
    railwaysProvider.fetchTrips(schedule, () => ({ agent }))
  )
);