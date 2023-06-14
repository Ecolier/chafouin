import { RequestInit } from 'node-fetch';
import { Schedule, Train } from '@chafouin/common/src/trip.js';

interface RailwaysProvider {
  fetchTrips: (schedule: Schedule, builder?: () => RequestInit) => Promise<Train[]>;
  stations: string[];
}

if (!process.env.RAILWAYS_PROVIDER_MODULE) {
  throw new Error('RAILWAYS_PROVIDER_MODULE must be set');
}

const railwaysProviderModule = process.env.RAILWAYS_PROVIDER_MODULE;
export default await import(railwaysProviderModule) as RailwaysProvider;