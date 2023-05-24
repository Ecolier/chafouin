import {EventEmitter} from "events";
import {Trip, TripSchedule, tripScheduleEquals} from "chafouin-shared"
import {TripUpdateFunction, TripWorker } from "./trip-worker.js";
import winston from "winston";
import { TripProvider } from "./provider.js";

export interface TripObserverOptions {
  interval: number;
}

type Clients = {[id: string]: EventEmitter};

export class TripObserver {
  private readonly tripWorkers = new Map<TripSchedule, TripWorker>();
  private readonly clientEmitters = new Map<TripSchedule, Clients>();
  private readonly emitter = new EventEmitter();

  private updateHandler = (forQuery: TripSchedule, updatedTrips: Trip[], outdatedTrips: Trip[]) => {
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

  private getWorker(forQuery: TripSchedule) {
    let foundWorker: TripWorker | undefined;
    this.tripWorkers.forEach((worker, query) => {
      if (tripScheduleEquals(query, forQuery)) {
        foundWorker = worker
      }
    });
    return foundWorker;
  }

  private getClients(forQuery: TripSchedule) {
    let foundClients: Clients = {}
    this.clientEmitters.forEach((clients, query) => {
      if (tripScheduleEquals(query, forQuery)) {
        foundClients = clients
      }
    });
    return foundClients;
  }

  private getClientCount(forQuery: TripSchedule) {
    let count = -1;
    this.clientEmitters.forEach((clients, query) => {
      if (tripScheduleEquals(query, forQuery)) {
        count = Object.keys(clients).length;
      }
    });
    return count;
  }

  onTripWorkerCreated(tripWorkerCreatedFn: (forQuery: TripSchedule, worker: TripWorker) => void) {
    this.emitter.on('trip_worker_created', tripWorkerCreatedFn);
  }

  onTripUpdate(forQuery: TripSchedule, clientId: number, tripUpdateFn: TripUpdateFunction) {
    const clients = this.getClients(forQuery);
    clients[clientId].on('update', tripUpdateFn);
  }

  addClient(forQuery: TripSchedule, channel?: number) {
    
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
      this.clientEmitters.set(forQuery, {0: new EventEmitter()});
      return 0;
    }
    const clientId = channel ?? Object.keys(existingClients).length;
    this.clientEmitters.set(forQuery, {[clientId]: new EventEmitter(), ...existingClients});
    winston.info(`Added new client with id. ${clientId} for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}.`);
    return clientId;
  }

  onTripWorkerDestroyed(fn: (query: TripSchedule, clientId: number) => void) {
    this.emitter.addListener('trip_worker_destroyed', fn);
  }

  onRemoveClient(fn: (query: TripSchedule, clientId: number) => void) {
    this.emitter.addListener('remove_client', fn);
  }

  removeAllClients() {
    Array.from(this.clientEmitters.entries()).forEach(([schedule, clients]) => {
      Object.keys(clients).forEach(clientId => {
        this.removeClient(schedule, parseInt(clientId));
      })
    });
  }

  removeClient(forQuery: TripSchedule, clientId: number) {
    winston.info(`Removing client with id. ${clientId} for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}.`);
    let existingClients = this.getClients(forQuery);

    // Destroy the client
    this.emitter.emit('remove_client', forQuery, clientId);
    existingClients[clientId].removeAllListeners('update');
    const {[clientId]: _, ...rest} = existingClients;
    existingClients = rest;
    this.clientEmitters.set(forQuery, existingClients);

    // If there are no more clients left, destroy the worker as well
    if (Object.keys(existingClients).length === 0) {
      winston.info(`Removing last client for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}. Stopping polling...`);
      const worker = this.getWorker(forQuery);
      worker?.stopPolling();
      worker?.emitter.removeAllListeners('update');
      this.emitter.emit('trip_worker_destroyed', forQuery, clientId);
    }
  }
}