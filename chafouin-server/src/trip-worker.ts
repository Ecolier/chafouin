import { EventEmitter } from 'events';
import { Trip, TripUpdate } from "../../chafouin-shared/trip.js";
import { TripQuery } from '../../chafouin-shared/trip-query.js';
import winston from 'winston';

export type FetchTripFunction = (query: TripQuery) => Promise<Trip[]>;
export type TripUpdateFunction = (updatedTrips: Trip[]) => void;

export class TripWorker {
  private tripsCache: Trip[] = [];
  private processId?: NodeJS.Timeout;
  
  emitter = new EventEmitter();

  constructor(private fetchFunction: FetchTripFunction) {}

  private poll = (withQuery: TripQuery): NodeJS.Timeout => {
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

  startPolling(withQuery: TripQuery) {
    this.processId = this.poll(withQuery);
  }

  stopPolling() {
    clearTimeout(this.processId);
  }
}