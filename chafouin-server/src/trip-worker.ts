import { EventEmitter } from 'events';
import { Trip, TripUpdate, TripSchedule } from 'chafouin-shared';
import winston from 'winston';

export type FetchTripFunction = (query: TripSchedule) => Promise<Trip[]>;
export type TripUpdateFunction = (updatedTrips: Trip[]) => void;

export class TripWorker {
  private tripsCache: Trip[] = [];
  private processId?: NodeJS.Timeout;
  
  emitter = new EventEmitter();

  constructor(private fetchFunction: FetchTripFunction) {}

  private poll = (withQuery: TripSchedule): NodeJS.Timeout => {
    this.fetchFunction(withQuery).then(trips => {
      const filteredTrips = trips.map<Trip | TripUpdate>((trip) => {
        const cachedTrip = this.tripsCache.find((cachedTrip) => trip.trainId === cachedTrip.trainId);
        if (cachedTrip && cachedTrip.freeSeats !== trip.freeSeats) {
          return {...trip, freeSeats: { current: trip.freeSeats, previous: cachedTrip.freeSeats }}
        }
        return trip;
      });
      this.emitter.emit('update', withQuery, filteredTrips);
      winston.info(`${withQuery.outboundStation} - ${withQuery.inboundStation} [${withQuery.departureDate}]: added ${trips.length} trips to cache.`)
      this.tripsCache = trips;
    });
    return setTimeout(this.poll.bind(this, withQuery), 60000);
  }

  startPolling(withQuery: TripSchedule) {
    this.processId = this.poll(withQuery);
  }

  stopPolling() {
    this.emitter.removeAllListeners('update');
    clearTimeout(this.processId);
    console.log('cleared', this.processId);
  }
}