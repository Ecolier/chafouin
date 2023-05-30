import { Schedule, Train, Trips } from 'chafouin-shared';
import createTorWorker from './utils/tor-worker.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Worker } from './utils/worker.js';

export type TripUpdateFn = (trips: Trips) => void;
export type fetchFn = (schedule: Schedule, agent: SocksProxyAgent) => Promise<Train[]>;

export type TripWorker = Worker<[Schedule], [Trips]>;

export default (workerId: string, fetch: fetchFn): TripWorker => {
let timer: NodeJS.Timeout;
return createTorWorker<[Schedule], [Trips]>(workerId, function (agent, schedule) {
  let cache: Train[] = [];
  (async function poll(this: TripWorker) {
    clearTimeout(timer);
    const trains = await fetch(schedule, agent);
    const updatedTrains = trains.map((train) => {
      const cachedTrain = cache.find((cachedTrain) => cachedTrain.name === train.name);
      if (cachedTrain 
        && typeof cachedTrain.freeSeats === 'number'
        && typeof train.freeSeats === 'number'
        && cachedTrain.freeSeats !== cachedTrain.freeSeats) {
          return {...train, freeSeats: { current: train.freeSeats, previous: cachedTrain.freeSeats }}
        }
        return train;
      });
      this.sendAll({
        schedule,
        trains: updatedTrains
      });
      cache = trains;
      timer = setTimeout(poll.bind(this), 30000);
    }).call(this);
  }, () => {
    clearTimeout(timer);
  })
}