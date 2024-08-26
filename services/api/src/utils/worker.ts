import createChannel, { Channel } from './channel.js';
import crypto from 'crypto';

import { logging } from '@chafouin/common';
const logger = logging('worker');

export type StartFunc<T extends unknown[], U extends unknown[]> = (this: Worker<T, U>, ...args: T) => void;
export type StopFunc<T extends unknown[], U extends unknown[]> = (this: Worker<T, U>, channelId: string) => void;

type Channels <U extends unknown[]> = {
  [id: string]: Channel<U>;
};

export interface Worker<T extends unknown[], U extends unknown[]> {
  channels: Channels<U>;
  start: (channelId: string, ...args: T) => [string, Channel<U>];
  stop: (channelId: string) => void;
  sendAll(...data: U): void;
}

export default function <T extends unknown[], U extends unknown[]> (
  startFunction: StartFunc<T, U>,
  stopFunction: StopFunc<T, U>): Worker<T, U> {
  return {
    channels: {},
    start(channelId, ...args) {
      channelId = channelId ?? crypto.randomUUID();
      let channel = this.channels[channelId];
      if (!channel) {
        channel = createChannel();
      }
      if (Object.keys(this.channels).length === 0) {
        logger.info(`Start and stream to ${ channelId }`);
        startFunction.apply(this, args);
      } else {
        logger.info(`Stream to ${ channelId }`);
      }
      this.channels[channelId] = channel;
      return [channelId, channel];
    },
    stop(channelId) {
      const channel = this.channels[channelId];
      if (!channel) {
        return;
      }
      logger.info(`${ channelId } unsubscribed`);
      channel.destroy();
      const { [channelId]: _, ...rest } = this.channels;
      this.channels = rest;
      if (Object.keys(this.channels).length === 0) {
        logger.info(`Stop because ${ channelId } was the last subscriber`);
        stopFunction.call(this, channelId);
      }
    },
    sendAll(...data: U) {
      Object.values(this.channels as Channels<U>).forEach(channel => {
        channel.send(...data);
      });
    },
  }
}