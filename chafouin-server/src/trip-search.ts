import { Router } from "express";
import { validateTripRequest } from "./trip-request-validate";
import { FetchTripFunction } from "./trip-worker";

export const searchTripRouter = (validStations: string[], fetchTripFunction: FetchTripFunction) => 
Router().get('/search', validateTripRequest(validStations), async (_, res) => {
  return res.send(await fetchTripFunction(res.locals.tripQuery));
});
