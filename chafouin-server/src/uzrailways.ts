import {TripQuery} from "./trip-query";
import {Trip} from "./trip";
import winston from "winston";

interface TripsResponse {
  express: {
    hasError: boolean;
    type: string;
    showWithoutPlaces: object;
    reqExpressZK: string;
    direction?: [{
      type: string;
      trains?: [{
        date: string;
        train: [{
          length: string;
          type: string;
          number: string;
          places: {
            cars: [{
              type: string;
              freeSeats: string;
            }]
          }
        }]
      }]
    }]
  }
}

const UZRAILWAYS_STATIONS: {[key: string]: string} = {
  2900000: "Tashkent",
  2900700: "Samarkand",
  2900800: "Bukhara",
  2900172: "Khiva",
  2900790: "Urgench",
  2900970: "Nukus",
  2900930: "Navoi",
  2900750: "Karshi",
  2900720: "Jizzakh",
  2900255: "Termez",
  2900850: "Gulistan",
  2900880: "Kokand",
  2900920: "Margilan",
  2900940: "Namangan",
} as const;

export const availableStations = Object.values(UZRAILWAYS_STATIONS);

if (!process.env.UZRAILWAYS_ORIGIN) {
  throw Error("process.env.UZRAILWAYS_ORIGIN should be set.");
}

const UZRAILWAYS_ORIGIN = process.env.UZRAILWAYS_ORIGIN;
const UZRAILWAYS_TRAINS_ENDPOINT = "/api/v1/trains/availability/space/between/stations";

export async function findTripsByDay({inboundStation, outboundStation, departureDate}: TripQuery): Promise<Trip[]> {
  winston.info(`Fetching trips by day on ${UZRAILWAYS_ORIGIN}${UZRAILWAYS_TRAINS_ENDPOINT}...`);
  const formattedDate = new Date(departureDate).toLocaleDateString("fr-FR").replaceAll("/", ".");

  let response;
  try {
    response = await fetch(`${UZRAILWAYS_ORIGIN}${UZRAILWAYS_TRAINS_ENDPOINT}`, {
      body: JSON.stringify({
        direction: [
          {
            depDate: formattedDate,
            fullday: true,
            type: "Forward",
          },
        ],
        stationFrom: Object.keys(UZRAILWAYS_STATIONS).find((stationId) => UZRAILWAYS_STATIONS[stationId].toUpperCase() === outboundStation.toUpperCase()),
        stationTo: Object.keys(UZRAILWAYS_STATIONS).find((stationId) => UZRAILWAYS_STATIONS[stationId].toUpperCase() === inboundStation.toUpperCase()),
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

  const content = await response.json() as TripsResponse;

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
    type: trip.type,
  }));
}
