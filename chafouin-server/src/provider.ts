import { Trip, TripSchedule } from 'chafouin-shared';

export interface TripProvider {
  onInstantiateWorker(withQuery: TripSchedule): void;
  fetchTrips(query: TripSchedule): Promise<Trip[]>;
  availableStations: string[];
}