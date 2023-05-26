import * as dotenv from 'dotenv';
dotenv.config();
import {TripSchedule, Trip, UzbekistanRailways} from 'chafouin-shared';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

import logging from './logging.js';
const logger = logging('uzrailways');

const UZRAILWAYS_ORIGIN = 'https://e-ticket.railway.uz';
const UZRAILWAYS_TRAINS_ENDPOINT = "/api/v1/trains/availability/space/between/stations";

export default {
  stations: Object.values(UzbekistanRailways.stations),
  async fetchTrips(schedule: TripSchedule, agent?: SocksProxyAgent): Promise<Trip[]> {
    const {inboundStation, outboundStation, departureDate} = schedule;
    const formattedDate = new Date(departureDate).toLocaleDateString("fr-FR").replaceAll("/", ".");
    
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
          stationFrom: Object.keys(UzbekistanRailways.stations).find((stationId) => UzbekistanRailways.stations[stationId].toUpperCase() === outboundStation.toUpperCase()),
          stationTo: Object.keys(UzbekistanRailways.stations).find((stationId) => UzbekistanRailways.stations[stationId].toUpperCase() === inboundStation.toUpperCase()),
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
    
    const content = await response.json() as UzbekistanRailways.TripsResponse;
    
    const trips = content.express?.direction?.[0].trains?.[0].train;
    if (!trips) {
      logger.error(`Couldn't extract trip data from response: ${response.statusText}`);
      return [];
    }
    
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
