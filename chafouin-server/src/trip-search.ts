import { Router } from "express";
import { validateTripRequest } from "./trip-request-validate.js";
import { FetchTripFunction } from "./trip-worker.js";

export const searchTripRouter = (validStations: string[], fetchTripFunction: FetchTripFunction) => 
Router().get('/search', validateTripRequest(validStations), async (_, res) => {
  return res.send(await fetchTripFunction(res.locals.tripSchedule));
});
