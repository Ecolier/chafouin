import {Request} from 'express';
import { TripQuery } from './trip-query';

export type TripRequest<T extends object = object> = Request<unknown, unknown, unknown, {
  outbound: string, 
  inbound: string, 
  date: string, 
  train: string, 
  type: string, 
  seats: boolean, 
  available: boolean
}, { tripQuery: TripQuery } & T>