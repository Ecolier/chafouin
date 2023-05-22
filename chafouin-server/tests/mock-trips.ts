import { Trip } from "../../chafouin-shared/trip";
import { TripQuery } from "../../chafouin-shared/trip-query";

function weightedRandom(specs: {[key: number]: number}) {
  let i, sum = 0;
  const r = Math.random();
  for (i in specs) {
    sum += specs[i];
    if (r <= sum) return parseInt(i);
  }
}

export function mockTrips(forQuery: TripQuery, count: number): [Trip[], Trip[]] {
  return [...new Array(2)].reduce((prev, curr, index) => 
    [...prev,[...new Array(count)].reduce((prevTrips, currTrips, tripIndex) => {
      let type = prev[index - 1]?.[tripIndex]?.trainType;
      if(!type) {
        type = Math.round(Math.random()) === 0 ? 'slow' : 'fast'; 
      }
      return [...prevTrips, {
        ...forQuery,
        trainId: `train-${tripIndex}`,
        trainType: type,
        freeSeats: weightedRandom({ 0: 0.5, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 }) ?? 0,
      }]
    }, [])
  ], []);
}