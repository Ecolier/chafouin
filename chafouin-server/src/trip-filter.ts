import { NextFunction, Response } from "express";
import { TripUpdate } from "../../chafouin-shared/trip.js";
import { TripRequest } from "./trip-request";
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

export function filterTrips(tripUpdates: TripUpdate[],
  {trainId, trainType, freeSeatCountUpdated, isNewlyAvailable}: TripFilters) {
  if (trainId) {
    tripUpdates = tripUpdates.filter(trip => (trip.trainId === trainId));
    winston.info(`Filter by train ${trainId}: ${tripUpdates.map((trip) => trip.trainId)}.`);
  } else if (trainType) {
    tripUpdates = tripUpdates.filter(trip => (trip.trainType === trainType));
    winston.info(`Filter by type ${trainType}: ${tripUpdates.map((trip) => trip.trainId)}.`);
  }
  if (freeSeatCountUpdated) {
    tripUpdates = tripUpdates.filter(trip => (typeof trip.freeSeats !== 'number'));
    winston.info(`Filter by seat changes: ${tripUpdates.map((trip) => trip.trainId)}.`);
  } else if (isNewlyAvailable) {
    tripUpdates = tripUpdates.filter(trip => (
      typeof trip.freeSeats !== 'number' && 
      trip.freeSeats.previous === 0 && 
      trip.freeSeats.current > trip.freeSeats.previous
    ));
    winston.info(`Filter by newly available: ${tripUpdates.map((trip) => trip.trainId)}.`);
  }
  
  winston.info(`Filtered result: ${tripUpdates.map((trip) => trip.trainId)}.`);
  return tripUpdates;
}