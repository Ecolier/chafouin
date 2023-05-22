import { Trip } from "../../chafouin-shared/trip";
import { TripQuery } from "../../chafouin-shared/trip-query";

export interface TripProvider {
  onInstantiateWorker(withQuery: TripQuery): void;
  fetchTrips(query: TripQuery): Promise<Trip[]>;
  availableStations: string[];
}