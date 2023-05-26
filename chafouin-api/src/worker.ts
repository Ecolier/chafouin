import { EventEmitter } from 'events';

type Channels = {
  [id: string]: EventEmitter;
};

export interface Worker<T extends unknown[]> {
  channels: Channels;
  start: (...args: T) => void;
  connect(channelId: string): void;
}

export default function <T extends unknown[]> (start: (...args: T) => void): Worker<T> {
  return {
    channels: {},
    start,
    connect(channelId) {
      const existingChannel = this.channels[channelId];
      if (!existingChannel) {
        return;
      }
    }
  }
}