import { Schedule, Train, Trips, logging } from '@chafouin/common';
import createTorWorker from './utils/tor-worker.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Worker } from './utils/worker.js';

const logger = logging('trip-worker');

export type TripUpdateFn = (trips: Trips) => void;
export type fetchFn = (schedule: Schedule, agent: SocksProxyAgent) => Promise<Train[]>;

export type TripWorker = Worker<[Schedule], [Trips]>;

export default (workerId: string, fetch: fetchFn): Promise<TripWorker> => {
  let timer: NodeJS.Timeout;
  return createTorWorker<[Schedule], [Trips]>(workerId, function (agent, schedule) {
    logger.info(`Fetching trips from ` +
    `${ schedule.outboundStation } to ${ schedule.inboundStation } on the ` +
    `${ schedule.departureDate.toLocaleDateString('fr-FR') }`);
    let cache: Train[] = [];
    (async function poll(this: TripWorker) {
      clearTimeout(timer);
      const trains = await fetch(schedule, agent);
      const updatedTrains = trains.map((train) => {
        const cachedTrain = cache.find((cachedTrain) => cachedTrain.name === train.name);
        if (cachedTrain 
          && typeof cachedTrain.freeSeats === 'number'
          && typeof train.freeSeats === 'number'
          && cachedTrain.freeSeats !== train.freeSeats) {
          return { ...train, freeSeats: { current: train.freeSeats, previous: cachedTrain.freeSeats }}
        }
        return train;
      });
      logger.info(`Fetched trains ${ trains.map(train => train.name) } for ${ workerId }`);
      this.sendAll({
        schedule,
        trains: updatedTrains
      });
      cache = trains;
      timer = setTimeout(poll.bind(this), 30000);
    }).call(this);
  }, () => {
    logger.info(`Stop fetching trips on ${ workerId }`);
    clearTimeout(timer);
    timer.unref();
  })
}