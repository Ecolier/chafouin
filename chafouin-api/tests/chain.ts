const createWorker = <T extends unknown[]> (start: (...args: T) => void) => ({ start })

const createTorWorker = <T extends unknown[]> (start: (agent: number, ...args: T) => void) => {
  return createWorker<T>((...args: T) => {
    const agent = 10;
    return start(agent, ...args);
  });
}

const createTripWorker = () => 
createTorWorker<[string]>((agent, schedule) => {
  console.log(agent, schedule);
});

createTripWorker().start('tashkent - samarkand');