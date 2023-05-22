
import { Trip, TripUpdate } from "../../chafouin-shared/trip";
import { TripQuery } from "../../chafouin-shared/trip-query";
import { mockTrips } from "./mock-trips";

const query: TripQuery = {
  outboundStation: 'tashkent',
  inboundStation: 'samarkand',
  departureDate: '2023-05-25'
};

const [updatedTrips, outdatedTrips] = mockTrips(query, 10);

const filteredTrips = updatedTrips.reduce<TripUpdate[]>((prev, curr) => {
  const updates: TripUpdate = curr;
  outdatedTrips.forEach(outdatedTrips => {
    if (curr.trainId === outdatedTrips.trainId) {
      updates.freeSeats = (curr.freeSeats !== outdatedTrips.freeSeats) ? {
        current: curr.freeSeats,
        previous: outdatedTrips.freeSeats
      } : curr.freeSeats;
    }
  })
  return [
    ...prev,
    updates
  ]
}, []);

console.log(filteredTrips);