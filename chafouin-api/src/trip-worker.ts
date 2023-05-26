import { TripSchedule, Trip, TripUpdate } from 'chafouin-shared';
import createTorWorker from './tor-worker.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { EventEmitter } from 'events';
import { Worker } from './worker.js';

export type TripUpdateFn = (trips: TripUpdate[]) => void;
export type fetchFn = (schedule: TripSchedule, agent: SocksProxyAgent) => Promise<Trip[]>;

export interface TripWorker extends Worker<[TripSchedule]> {
  update(updateFn: TripUpdateFn): void;
}

export default (workerId: string, fetch: fetchFn): TripWorker => {
  const emitter = new EventEmitter();
  return {
    ...createTorWorker<[TripSchedule]>(workerId, (agent, schedule) => {
      let cache: Trip[] = [];
      let timeout: NodeJS.Timeout;
      (async function poll() {
        const trips = await fetch(schedule, agent)
        const filteredTrips = trips.map<Trip | TripUpdate>((trip) => {
          const cachedTrip = cache.find((cachedTrip) => trip.trainId === cachedTrip.trainId);
          if (cachedTrip && cachedTrip.freeSeats !== trip.freeSeats) {
            return {...trip, freeSeats: { current: trip.freeSeats, previous: cachedTrip.freeSeats }}
          }
          return trip;
        });
        emitter.emit('update', filteredTrips);
        cache = trips;
        timeout = setTimeout(poll, 30000);
      })();
    }),
    update(updateFn: TripUpdateFn) {
      emitter.on('update', updateFn);
    }
  }
};



