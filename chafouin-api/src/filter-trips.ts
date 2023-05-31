import { Train, Trips } from 'chafouin-shared';
import { TrainFilters } from './middlewares/parse-filters';

export default function(trips: Trips, filters: TrainFilters): Trips {
  let trains: Train[] = trips.trains;
  if (filters.name) {
    trains = trains.filter(train => train.name === filters.name);
  }
  if (filters.type) {
    trains = trains.filter(train => train.type === filters.type);
  }
  if (filters.seats) {
    trains = trains.filter(train => (typeof train.freeSeats !== 'number'));
  } else if (filters.available) {
    trains = trains.filter(train => (
      typeof train.freeSeats !== 'number' && 
      train.freeSeats.previous === 0 && 
      train.freeSeats.current > train.freeSeats.previous
    ));
  }
  return {
    ...trips,
    trains,
  };
}