import * as dotenv from 'dotenv';
dotenv.config();
import {Schedule, Train, uzrailways} from 'chafouin-shared';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

import logging from './utils/logging.js';
const logger = logging('uzrailways');

const UZRAILWAYS_ORIGIN = 'https://chipta.railway.uz';
const UZRAILWAYS_TRAINS_ENDPOINT = "/api/v1/trains/availability/space/between/stations";

export default {
  stations: Object.values(uzrailways.stations),
  async fetchTrips(schedule: Schedule, agent?: SocksProxyAgent): Promise<Train[]> {
    const formattedDate = new Date(schedule.departureDate).toLocaleDateString("fr-FR").replaceAll("/", ".");
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
          stationFrom: Object.keys(uzrailways.stations).find((stationId) => uzrailways.stations[stationId].toUpperCase() === schedule.outboundStation.toUpperCase()),
          stationTo: Object.keys(uzrailways.stations).find((stationId) => uzrailways.stations[stationId].toUpperCase() === schedule.inboundStation.toUpperCase()),
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
      logger.error(`Request couldn't complete due to a network error (${error})`);
      return [];
    }
    
    let content;
    try {
      content = await response.json() as uzrailways.TripsResponse;
    } catch (e) {
      logger.error(`Couldn't read JSON from ${response.body}`);
      return [];
    }
    
    const trips = content.express?.direction?.[0].trains?.[0].train;
    if (!trips) {
      logger.error(`Couldn't extract trip data from response: ${content}`);
      return [];
    }
    
    return trips.map((trip) => ({
      name: trip.number,
      freeSeats: trip.places.cars.reduce((prev, curr) => (prev + parseInt(curr.freeSeats)), 0),
      type: trip.type,
    }));
  }
}
