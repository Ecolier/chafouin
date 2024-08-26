import { Schedule, Train, logging } from '@chafouin/common';
import { TripsResponse } from './trips-response.js';
import stations from './stations.js';
import fetch, { RequestInit } from 'node-fetch';
import config from '../config.json' with {type: 'json'};

const logger = logging('fetch-trips');

export default async function (schedule: Schedule, builder?: () => RequestInit): Promise<Train[]> {
  const formattedDate = schedule.departureDate.toLocaleDateString('fr-FR').replaceAll('/', '.');
  const outboundStation = Object.keys(stations).find((stationId) => stations[stationId].toUpperCase() === schedule.outboundStation.toUpperCase());
  const inboundStation = Object.keys(stations).find((stationId) => stations[stationId].toUpperCase() === schedule.inboundStation.toUpperCase());
  const request = builder ? builder() : {};

  let response;
  try {
    response = await fetch(config.fetchTripsUrl, {
      ...request,
      body: JSON.stringify({
        direction: [
          {
            depDate: formattedDate,
            fullday: true,
            type: 'Forward',
          },
        ],
        stationFrom: outboundStation,
        stationTo: inboundStation,
        detailNumPlaces: 1,
        showWithoutPlaces: 0,
      }),
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  } catch (error) {
    logger.error(`Request couldn't complete due to a network error (${ error })`);
    return [];
  }
  
  let content;
  try {
    content = await response.json() as TripsResponse;
  } catch (e) {
    logger.error(`Couldn't read JSON from ${ response.body }`);
    return [];
  }
  
  const trips = content.express?.direction?.[0].trains?.[0].train;
  if (!trips) {
    logger.error(`Couldn't extract trip data from response: ${ content }`);
    return [];
  }
  
  return trips.map((trip) => ({
    name: trip.number,
    freeSeats: trip.places.cars.reduce((prev, curr) => (prev + parseInt(curr.freeSeats)), 0),
    type: trip.type,
  }));
}