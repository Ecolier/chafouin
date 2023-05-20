import { NextFunction, Response } from "express";
import { Trip } from "./trip";
import { TripRequest } from "./trip-request";
import _ from 'lodash';
import winston from "winston";

export type TripFilters = Partial<{
  trainId: string;
  trainType: string;
  freeSeatCountUpdated: boolean;
  isNewlyAvailable: boolean;
}>;

export type TripFilterRequest = TripRequest<{tripFilters: TripFilters}>;

export function parseTripFilters(req: TripFilterRequest, res: Response, next: NextFunction) {
  const {
    train: trainId,
    type: trainType,
    seats: freeSeatCountUpdated,
    available: isNewlyAvailable
  } = req.query;
  res.locals.tripFilters = {
    trainId, trainType, freeSeatCountUpdated, isNewlyAvailable
  };
  return next();
}

export function filterTrips(newTrips: Trip[], oldTrips: Trip[],
  {trainId, trainType, freeSeatCountUpdated, isNewlyAvailable}: TripFilters) {
  let result = newTrips;
  
  if (trainId) {
    newTrips = newTrips.filter(trip => (trip.trainId === trainId));
    oldTrips = oldTrips.filter(trip => (trip.trainId === trainId));
    winston.info(`Filter by train ${trainId}: ${newTrips.map((trip) => trip.trainId)}.`);
  } else if (trainType) {
    newTrips = newTrips.filter(trip => (trip.type === trainType));
    oldTrips = oldTrips.filter(trip => (trip.type === trainType));
    winston.info(`Filter by type ${trainType}: ${newTrips.map((trip) => trip.trainId)}.`);
  }
  
  if (freeSeatCountUpdated) {
    result = _.differenceWith(oldTrips, newTrips, (a, b) => (a.freeSeats === b.freeSeats));
    winston.info(`Filter by seat changes: ${result.map((trip) => trip.trainId)}.`);
  } else if (isNewlyAvailable) {
    result = newTrips.filter(updatedTrip => {
      const same = oldTrips.find(outdatedTrip => (outdatedTrip.trainId === updatedTrip.trainId));
      return (same?.freeSeats === 0 && updatedTrip.freeSeats > 0);
    });
    winston.info(`Filter by newly available: ${result.map((trip) => trip.trainId)}.`);
  }
  
  winston.info(`Filtered result: ${result.map((trip) => trip.trainId)}.`);
  return result;
}