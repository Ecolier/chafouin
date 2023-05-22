import {EventEmitter} from "events";
import {Trip} from "../../chafouin-shared/trip.js";
import {TripQuery, areTripQueriesEqual} from "../../chafouin-shared/trip-query.js";
import {FetchTripFunction, TripUpdateFunction, TripWorker } from "./trip-worker.js";
import winston from "winston";
import { torrc } from "./tor.js";
import * as fs from 'fs'
import { TripProvider } from "./provider.js";

export interface TripObserverOptions {
  interval: number;
}

type Clients = {[id: string]: EventEmitter};

export class TripObserver {
  private readonly tripWorkers = new Map<TripQuery, TripWorker>();
  private readonly clientEmitters = new Map<TripQuery, Clients>();
  private readonly emitter = new EventEmitter();

  private updateHandler = (forQuery: TripQuery, updatedTrips: Trip[], outdatedTrips: Trip[]) => {
    const clients = this.getClients(forQuery);
    Object.entries(clients).forEach(([clientId, emitter]) => {
      winston.info(`sending update to client ${clientId}, registered for query ${forQuery.outboundStation} - ${forQuery.inboundStation}, on ${forQuery.departureDate}`);
      emitter.emit('update', updatedTrips, outdatedTrips);
    });
  }

  constructor(
    private readonly tripProvider: TripProvider, 
    public readonly options: TripObserverOptions = {
    interval: 60000,
  }) {}

  private getWorker(forQuery: TripQuery) {
    let foundWorker: TripWorker | undefined;
    this.tripWorkers.forEach((worker, query) => {
      if (areTripQueriesEqual(query, forQuery)) {
        foundWorker = worker
      }
    });
    return foundWorker;
  }

  private getClients(forQuery: TripQuery) {
    let foundClients: Clients = {}
    this.clientEmitters.forEach((clients, query) => {
      if (areTripQueriesEqual(query, forQuery)) {
        foundClients = clients
      }
    });
    return foundClients;
  }

  private getClientCount(forQuery: TripQuery) {
    let count = -1;
    this.clientEmitters.forEach((clients, query) => {
      if (areTripQueriesEqual(query, forQuery)) {
        count = Object.keys(clients).length;
      }
    });
    return count;
  }

  onTripWorkerCreated(tripWorkerCreatedFn: (forQuery: TripQuery, worker: TripWorker) => void) {
    this.emitter.on('trip_worker_created', tripWorkerCreatedFn);
  }

  addClient(forQuery: TripQuery, onUpdate: TripUpdateFunction) {
    const clientEmitter = new EventEmitter();
    clientEmitter.on('update', onUpdate);
    const existingClients = this.getClients(forQuery);
    
    // First client instantiating, create the trip worker.
    if (Object.keys(existingClients).length === 0) {
      winston.info(`Adding new trip worker for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}. Starting polling...`);
      const worker = new TripWorker(this.tripProvider.fetchTrips);
      this.tripProvider.onInstantiateWorker(forQuery);
      worker.emitter.on('update', this.updateHandler);
      this.tripWorkers.set(forQuery, worker);
      worker.startPolling(forQuery);
      this.emitter.emit('trip_worker_created', forQuery, worker);
      this.clientEmitters.set(forQuery, {0: clientEmitter});
      return 0;
    }
    const clientId = Object.keys(existingClients).length;
    this.clientEmitters.set(forQuery, {[clientId]: clientEmitter, ...existingClients});
    winston.info(`Added new client with id. ${clientId} for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}.`);
    return clientId;
  }

  removeClient(forQuery: TripQuery, clientId: number) {
    winston.info(`Removing client with id. ${clientId} for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}.`);
    let existingClients = this.getClients(forQuery);
    const {[clientId]: _, ...rest} = existingClients;
    existingClients = rest;
    if (Object.keys(existingClients).length === 0) {
      winston.info(`Removing last client for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}. Stopping polling...`);
      this.getWorker(forQuery)?.stopPolling();
    }
    this.clientEmitters.set(forQuery, existingClients);
  }
}