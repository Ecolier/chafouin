import {EventEmitter} from "events";
import logging from './logging.js'
import crypto from 'crypto';
import { Worker } from "./worker.js";

const logger = logging('broadcaster');

type Workers<W> = {
  [id: string]: W;
}

export type DisconnectFn = (channelId: string) => void;
export type CreateWorkerFn<W> = (workerId: string) => W;
export type StartWorkerFn<W> = (workerId: string, worker: W) => void;

export interface Broadcast<W> {
  workers: Workers<W>;
  subscribe(workerId: string, channelId?: string): [W, string];
  unsubscribe(workerId: string, channelId: string): void;
  disconnect(disconnectFn: DisconnectFn): void;
  startWorker(startWorkerFn: StartWorkerFn<W>): void;
}

export default function<T extends unknown[], W extends Worker<T>>(createWorker: CreateWorkerFn<W>): Broadcast<W> {
  const emitter = new EventEmitter();
  return {
    workers: {},
    startWorker(startWorkerFn: StartWorkerFn<W>) {
      emitter.on('start_worker', startWorkerFn);
    },
    subscribe(workerId: string, channelId?: string) {
      let existingWorker = this.workers[workerId];
      if (!existingWorker) {
        logger.info(`Create new worker ${workerId}`);
        existingWorker = createWorker(workerId);
        this.workers[workerId] = existingWorker;
        emitter.emit('start_worker', workerId, this.workers[workerId]);
      }
      channelId = channelId ?? crypto.randomUUID();
      existingWorker.connect(channelId);
      return [existingWorker, channelId];
    },
    unsubscribe(workerId: string, channelId: string) {
      const existingWorker = this.workers[workerId];
      if (!existingWorker) {
        return;
      }
      delete existingWorker.channels[channelId];
      if (Object.keys(existingWorker).length === 0) {
        emitter.emit('disconnect', channelId);
      }
    },
    disconnect(disconnectFn: DisconnectFn) {
      emitter.on('disconnect', disconnectFn);
    }
  }
}