import { Schedule, Train, Trips } from '@chafouin/common';
import { TripUpdateFn } from '../src/trip-worker.js.js';

function weightedRandom(specs: {[key: string]: number}): number | undefined {
  let i: string;
  let sum = 0;
  const r: number = Math.random();
  for (i in specs) {
    sum += specs[i];
    if (r <= sum) {
      return parseInt(i);
    }
  }
}

interface TrainSchema {
  name: string;
  type: string;
}

export function fetchTrips(schedule: Schedule, trainSchemas: TrainSchema[]): Trips {
  return {
    schedule,
    trains: trainSchemas.map((schema) => ({
      name: schema.name, 
      type: schema.type,
      freeSeats: weightedRandom({ 0: 0.5, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 }) ?? 0
    }))
  }
}

function pollTrips(fetch: () => Trips, tripUpdateFn: TripUpdateFn, options: {interval: number} = {interval: 10000}) {
  let timeout;
  (function emit () {
    clearTimeout(timeout);
    tripUpdateFn(fetch());
    timeout = setTimeout(emit, options.interval);
  })();
}

const fetchers = [
  () => fetchTrips(new Schedule('Tashkent', 'Samarkand', new Date(2023, 6, 1)), [
    { name: 'train-0', type: 'fast' },
    { name: 'train-2', type: 'slow' },
    { name: 'train-4', type: 'slow' },
    { name: 'train-5', type: 'fast' },
  ]),
  () => fetchTrips(new Schedule('Samarkand', 'Bukhara', new Date(2023, 5, 10)), [
    { name: 'train-10', type: 'fast' },
    { name: 'train-11', type: 'fast' },
  ]),
  () => fetchTrips(new Schedule('Namangan', 'Termez', new Date(2023, 4, 5)), [
    { name: 'train-0', type: 'slow' }
  ]),
];

fetchers.forEach(function(fetcher) {
  let cachedTrains: Train[] = [];
  pollTrips(fetcher, (trips) => {
    const trains = trips.trains.map((train) => {
      const cachedTrain = cachedTrains.find((cachedTrain) => cachedTrain.name === train.name);
      if (cachedTrain 
        && typeof cachedTrain.freeSeats === 'number'
        && typeof train.freeSeats === 'number'
        && train.freeSeats !== cachedTrain.freeSeats) {
        return {...train, freeSeats: { current: train.freeSeats, previous: cachedTrain.freeSeats }}
      }
      return train;
    });
    console.log({schedule: trips.schedule, trains});
    cachedTrains = trips.trains;
  }, {interval: 5000});
});