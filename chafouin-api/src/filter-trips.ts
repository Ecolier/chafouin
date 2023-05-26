import { TripUpdate } from 'chafouin-shared';
import { TripFilters } from './middlewares/parse-filters';

export default function(tripUpdates: TripUpdate[],
  {trainId, trainType, freeSeatCountUpdated, isNewlyAvailable}: TripFilters) {
  if (trainId) {
    tripUpdates = tripUpdates.filter(trip => (trip.trainId === trainId));
  } else if (trainType) {
    tripUpdates = tripUpdates.filter(trip => (trip.trainType === trainType));
  }
  if (freeSeatCountUpdated) {
    tripUpdates = tripUpdates.filter(trip => (typeof trip.freeSeats !== 'number'));
  } else if (isNewlyAvailable) {
    tripUpdates = tripUpdates.filter(trip => (
      typeof trip.freeSeats !== 'number' && 
      trip.freeSeats.previous === 0 && 
      trip.freeSeats.current > trip.freeSeats.previous
    ));
  }
  return tripUpdates;
}