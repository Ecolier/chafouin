import { EventEmitter } from 'events';
import winston from 'winston';
export class TripWorker {
    constructor(fetchFunction) {
        this.fetchFunction = fetchFunction;
        this.tripsCache = [];
        this.emitter = new EventEmitter();
        this.poll = (withQuery) => {
            this.fetchFunction(withQuery).then(trips => {
                const filteredTrips = trips.map((trip) => {
                    const cachedTrip = this.tripsCache.find((cachedTrip) => trip.trainId === cachedTrip.trainId);
                    if (cachedTrip && cachedTrip.freeSeats !== trip.freeSeats) {
                        return Object.assign(Object.assign({}, trip), { freeSeats: { current: trip.freeSeats, previous: cachedTrip.freeSeats } });
                    }
                    return trip;
                });
                this.emitter.emit('update', withQuery, filteredTrips);
                winston.info(`${withQuery.outboundStation} - ${withQuery.inboundStation} [${withQuery.departureDate}]: added ${trips.length} trips to cache.`);
                this.tripsCache = trips;
            });
            return setTimeout(this.poll.bind(this, withQuery), 60000);
        };
    }
    startPolling(withQuery) {
        this.processId = this.poll(withQuery);
    }
    stopPolling() {
        clearTimeout(this.processId);
    }
}
