import * as dotenv from 'dotenv';
dotenv.config();
import {TripQuery} from "../../chafouin-shared/trip-query.js";
import {Trip} from "../../chafouin-shared/trip.js";
import winston from 'winston';
import fetch from 'node-fetch';
import { TripProvider } from './provider.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { UZRW_STATIONS } from '../../chafouin-shared/uzrailways/stations.js';
import { UZRWTripsResponse } from '../../chafouin-shared/uzrailways/trips-response.js';
import fs from 'fs';
import { torrc } from './tor.js';
import { exec } from 'child_process';

const UZRAILWAYS_ORIGIN = 'https://e-ticket.railway.uz';
const UZRAILWAYS_TRAINS_ENDPOINT = "/api/v1/trains/availability/space/between/stations";

export class UZRWTripProvider implements TripProvider {
  
  private torAgents: [query: TripQuery, agent: SocksProxyAgent][] = [];
  availableStations = Object.values(UZRW_STATIONS);
  
  onInstantiateWorker(query: TripQuery): void {
    const count = this.torAgents.length;
    fs.writeFileSync(`/etc/tor/torrc.${count}`, torrc(9050 + (10 * count), 9051 + (10 * count), count));
    exec(`tor -f /etc/tor/torrc.${count}`);
    this.torAgents.push([query, new SocksProxyAgent(`socks5h://127.0.0.1:${9050 + (10 * count)}`)]);
    winston.info(`Added agent no. ${count} for ${query.outboundStation} - ${query.inboundStation}`);
  }
  
  fetchTrips = async (tripQuery: TripQuery): Promise<Trip[]> => {
    const {inboundStation, outboundStation, departureDate} = tripQuery;
    const formattedDate = new Date(departureDate).toLocaleDateString("fr-FR").replaceAll("/", ".");

    const [, agent] = this.torAgents.find(([query]) => query === tripQuery) ?? [];
    if (!agent) {
      throw Error(`Couldn't find agent for query`);
    }
    
    let response;
    try {
      response = await fetch(`${UZRAILWAYS_ORIGIN}${UZRAILWAYS_TRAINS_ENDPOINT}`, {
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
    } catch (error) {
      winston.error(`Request couldn't complete due to a network error (${error})`);
      return [];
    }
    
    const content = await response.json() as UZRWTripsResponse;
    
    const trips = content.express?.direction?.[0].trains?.[0].train;
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
  }
}