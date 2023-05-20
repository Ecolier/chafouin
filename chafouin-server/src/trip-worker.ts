import { EventEmitter } from 'events';
import { Trip } from "./trip";
import { TripQuery } from './trip-query';

export type FetchTripFunction = (query: TripQuery) => Promise<Trip[]>;
export type TripUpdateFunction = (updatedTrips: Trip[], outdatedTrips: Trip[]) => void;

export class TripWorker {
  private tripsCache: Trip[] = [];
  private processId?: NodeJS.Timeout;
  
  emitter = new EventEmitter();

  constructor(private fetchFunction: FetchTripFunction) {}

  private poll = (withQuery: TripQuery): NodeJS.Timeout => {
    this.fetchFunction(withQuery).then(trips => {
      this.emitter.emit('update', withQuery, trips, this.tripsCache);
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