var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { EventEmitter } from "events";
import { areTripQueriesEqual } from "../../chafouin-shared/trip-query.js";
import { TripWorker } from "./trip-worker.js";
import winston from "winston";
export class TripObserver {
    constructor(tripProvider, options = {
        interval: 60000,
    }) {
        this.tripProvider = tripProvider;
        this.options = options;
        this.tripWorkers = new Map();
        this.clientEmitters = new Map();
        this.emitter = new EventEmitter();
        this.updateHandler = (forQuery, updatedTrips, outdatedTrips) => {
            const clients = this.getClients(forQuery);
            Object.entries(clients).forEach(([clientId, emitter]) => {
                winston.info(`sending update to client ${clientId}, registered for query ${forQuery.outboundStation} - ${forQuery.inboundStation}, on ${forQuery.departureDate}`);
                emitter.emit('update', updatedTrips, outdatedTrips);
            });
        };
    }
    getWorker(forQuery) {
        let foundWorker;
        this.tripWorkers.forEach((worker, query) => {
            if (areTripQueriesEqual(query, forQuery)) {
                foundWorker = worker;
            }
        });
        return foundWorker;
    }
    getClients(forQuery) {
        let foundClients = {};
        this.clientEmitters.forEach((clients, query) => {
            if (areTripQueriesEqual(query, forQuery)) {
                foundClients = clients;
            }
        });
        return foundClients;
    }
    getClientCount(forQuery) {
        let count = -1;
        this.clientEmitters.forEach((clients, query) => {
            if (areTripQueriesEqual(query, forQuery)) {
                count = Object.keys(clients).length;
            }
        });
        return count;
    }
    onTripWorkerCreated(tripWorkerCreatedFn) {
        this.emitter.on('trip_worker_created', tripWorkerCreatedFn);
    }
    addClient(forQuery, onUpdate) {
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
            this.clientEmitters.set(forQuery, { 0: clientEmitter });
            return 0;
        }
        const clientId = Object.keys(existingClients).length;
        this.clientEmitters.set(forQuery, Object.assign({ [clientId]: clientEmitter }, existingClients));
        winston.info(`Added new client with id. ${clientId} for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}.`);
        return clientId;
    }
    removeClient(forQuery, clientId) {
        var _a;
        winston.info(`Removing client with id. ${clientId} for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}.`);
        let existingClients = this.getClients(forQuery);
        const _b = existingClients, _c = clientId, _ = _b[_c], rest = __rest(_b, [typeof _c === "symbol" ? _c : _c + ""]);
        existingClients = rest;
        if (Object.keys(existingClients).length === 0) {
            winston.info(`Removing last client for query ${forQuery.outboundStation} to ${forQuery.inboundStation} on ${forQuery.departureDate}. Stopping polling...`);
            (_a = this.getWorker(forQuery)) === null || _a === void 0 ? void 0 : _a.stopPolling();
        }
        this.clientEmitters.set(forQuery, existingClients);
    }
}
