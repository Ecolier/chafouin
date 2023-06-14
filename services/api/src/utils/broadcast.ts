import { EventEmitter } from 'events';
import { Worker } from './worker.js';

import { logging } from '@chafouin/common';
const logger = logging('broadcaster');

type Workers<T extends unknown[], U extends unknown[]> = {
  [id: string]: Worker<T, U>;
}

export type ConnectFunction = (workerId: string, channelId: string) => void;
export type DisconnectFunction = (workerId: string, channelId: string) => void;
export type InitWorkerFunction<T extends unknown[], U extends unknown[]> = (workerId: string) => Worker<T, U> | Promise<Worker<T, U>>;
export type CreateWorkerFunction<T extends unknown[], U extends unknown[]> = (workerId: string, worker: Worker<T, U>) => void;

export interface Broadcast<T extends unknown[], U extends unknown[]> {
  workers: Workers<T, U>;
  subscribe(workerId: string): Worker<T, U> | Promise<Worker<T, U>>;
  unsubscribe(workerId: string, channelId: string): void;
  createWorker(fn: CreateWorkerFunction<T, U>): void;
  connect(fn: ConnectFunction): void;
  disconnect(fn: DisconnectFunction): void;
}

export default function<T extends unknown[], U extends unknown[]>(initWorker: InitWorkerFunction<T, U>): Broadcast<T, U> {
  const emitter = new EventEmitter();
  return {
    workers: {},
    createWorker(fn: CreateWorkerFunction<T, U>) {
      emitter.on('create_worker', fn);
    },
    connect(fn: ConnectFunction) {
      emitter.on('connect', fn);
    },
    disconnect(fn: DisconnectFunction) {
      emitter.on('disconnect', fn);
    },
    async subscribe(workerId: string) {
      logger.info(`Subscribe to worker ${ workerId }`);
      let worker = this.workers[workerId];
      if (!worker) {
        logger.info(`Create worker ${ workerId }`);
        worker = await Promise.resolve(initWorker(workerId));
        this.workers[workerId] = worker;
        emitter.emit('create_worker', workerId, this.workers[workerId]);
      }
      return worker;
    },
    unsubscribe(workerId: string, channelId: string) {
      logger.info(`Unsubscribe from worker ${ workerId }`);
      const worker = this.workers[workerId];
      if (!worker) {
        return;
      }
      worker.stop(channelId);
      const { [workerId]: _, ...rest } = this.workers;
      this.workers = rest;
    },
  }
}