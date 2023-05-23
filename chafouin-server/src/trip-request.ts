import {Request} from 'express';
import { TripSchedule } from 'chafouin-shared';

export type TripRequest<T extends object = object> = Request<unknown, unknown, unknown, {
  outbound: string, 
  inbound: string, 
  date: string, 
  train: string, 
  type: string, 
  seats: boolean, 
  available: boolean
}, { tripSchedule: TripSchedule } & T>