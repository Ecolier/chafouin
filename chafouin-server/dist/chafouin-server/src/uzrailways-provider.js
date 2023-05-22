var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as dotenv from 'dotenv';
dotenv.config();
import winston from 'winston';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { UZRW_STATIONS } from '../../chafouin-shared/uzrailways/stations.js';
import fs from 'fs';
import { torrc } from './tor.js';
import { exec } from 'child_process';
const UZRAILWAYS_ORIGIN = 'https://e-ticket.railway.uz';
const UZRAILWAYS_TRAINS_ENDPOINT = "/api/v1/trains/availability/space/between/stations";
export class UZRWTripProvider {
    constructor() {
        this.torAgents = [];
        this.availableStations = Object.values(UZRW_STATIONS);
        this.fetchTrips = (tripQuery) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { inboundStation, outboundStation, departureDate } = tripQuery;
            const formattedDate = new Date(departureDate).toLocaleDateString("fr-FR").replaceAll("/", ".");
            const [, agent] = (_a = this.torAgents.find(([query]) => query === tripQuery)) !== null && _a !== void 0 ? _a : [];
            if (!agent) {
                throw Error(`Couldn't find agent for query`);
            }
            let response;
            try {
                response = yield fetch(`${UZRAILWAYS_ORIGIN}${UZRAILWAYS_TRAINS_ENDPOINT}`, {
                    agent,
                    body: JSON.stringify({
                        direction: [
                            {
                                depDate: formattedDate,
                                fullday: true,
                                type: "Forward",
                            },
                        ],
                        stationFrom: Object.keys(UZRW_STATIONS).find((stationId) => UZRW_STATIONS[stationId].toUpperCase() === outboundStation.toUpperCase()),
                        stationTo: Object.keys(UZRW_STATIONS).find((stationId) => UZRW_STATIONS[stationId].toUpperCase() === inboundStation.toUpperCase()),
                        detailNumPlaces: 1,
                        showWithoutPlaces: 0,
                    }),
                    headers: {
                        "Accept": "application/json",
                        "Accept-Language": "en",
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                });
            }
            catch (error) {
                winston.error(`Request couldn't complete due to a network error (${error})`);
                return [];
            }
            const content = yield response.json();
            const trips = (_d = (_c = (_b = content.express) === null || _b === void 0 ? void 0 : _b.direction) === null || _c === void 0 ? void 0 : _c[0].trains) === null || _d === void 0 ? void 0 : _d[0].train;
            if (!trips) {
                winston.error(`Couldn't extract trip data from response: ${response.statusText}`);
                return [];
            }
            winston.info(`Successfully fetched ${trips.length} trips for query.`);
            return trips.map((trip) => ({
                trainId: trip.number,
                outboundStation,
                inboundStation,
                departureDate,
                freeSeats: trip.places.cars.reduce((prev, curr) => (prev + parseInt(curr.freeSeats)), 0),
                trainType: trip.type,
            }));
        });
    }
    onInstantiateWorker(query) {
        const count = this.torAgents.length;
        fs.writeFileSync(`/usr/local/etc/tor/torrc.${count}`, torrc(9050 + (10 * count), 9051 + (10 * count), count));
        exec(`tor -f /usr/local/etc/tor/torrc.${count}`);
        this.torAgents.push([query, new SocksProxyAgent(`socks5h://127.0.0.1:${9050 + (10 * count)}`)]);
        winston.info(`Added agent no. ${count} for ${query.outboundStation} - ${query.inboundStation}`);
    }
}
