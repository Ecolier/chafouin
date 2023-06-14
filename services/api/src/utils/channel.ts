import { EventEmitter } from 'events';

export interface Channel <U extends unknown[]> {
  data(fn: (args: U) => void): void;
  send(...data: U): void;
  destroy(): void;
  onDestroy(fn: () => void): void;
}

export default function<U extends unknown[]>(): Channel<U> {
  const emitter = new EventEmitter();
  return {
    send(...data) { emitter.emit('data', data) },
    data(fn) { emitter.on('data', fn) },
    destroy() { 
      emitter.emit('destroy');
      emitter.removeAllListeners();
    },
    onDestroy(fn: () => void) {
      emitter.on('destroy', fn);
    }
  }
}