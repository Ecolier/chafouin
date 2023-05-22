var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Router } from 'express';
import { filterTrips, parseTripFilters } from './trip-filter.js';
import { validateTripRequest } from './trip-request-validate.js';
export const subscribeTripRouter = (tripObserver, validStations) => Router().get('/subscribe', validateTripRequest(validStations), parseTripFilters, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = res.locals.tripQuery;
    const filters = res.locals.tripFilters;
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    const clientId = tripObserver.addClient(query, (updatedTrips) => {
        const filteredTrips = filterTrips(updatedTrips, filters);
        if (filteredTrips.length === 0) {
            return;
        }
        res.write('event: update\ndata: ' + JSON.stringify(filteredTrips) + '\n\n');
    });
    res.on('close', () => {
        tripObserver.removeClient(query, clientId);
        res.end();
    });
}));
