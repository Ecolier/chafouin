import { SocksProxyAgent } from "socks-proxy-agent";
import createWorker, { Worker } from "./worker.js";

import fs from 'fs';
import path from 'path';
import {exec} from 'child_process';

const dataDirectory = process.env.TOR_DATA_DIR;
const configDirectory = process.env.TOR_CONFIG_DIR;
if (!dataDirectory || !configDirectory) {
  throw Error('Environment variables TOR_CONFIG_DIR and TOR_DATA_DIR must be set')
}

export const torrc = (socksPort: number, controlPort: number, agentId: string) => `
SocksPort ${socksPort}
ControlPort ${controlPort}
DataDirectory ${dataDirectory}/${agentId}
`;

type Agents = {[workerId: string]: SocksProxyAgent};

const agents: Agents = {};

export default <T extends unknown[], U extends unknown[]> (
  agentId: string, 
  start: (this: Worker<T, U>, agent: SocksProxyAgent, ...args: T) => void,
  stop: (this: Worker<T, U>) => void
  ) => {
  const process = agentId.replaceAll(':', '_');
  const torDir = path.resolve(path.join(configDirectory, process));
  const torrcFileDir = path.resolve(path.join(torDir, 'torrc'));
  return createWorker<T, U>(function (...args: T) {
    const agentsCount = Object.keys(agents).length;
    const agentPort = 9050 + (10 * agentsCount);
    const controlPort =  9051 + (10 * agentsCount);
    if (!fs.existsSync(torDir)){
      fs.mkdirSync(torDir, { recursive: true });
    }
    fs.writeFileSync(torrcFileDir, torrc(agentPort, controlPort, process));
    exec(`exec -a ${process} /usr/bin/tor -f ${torrcFileDir}`);
    const agent = new SocksProxyAgent(`socks5h://127.0.0.1:${agentPort}`);
    agents[agentId] = agent;
    return start.call(this, agent, ...args);
  }, function () {
    exec(`pkill -f ${process}`);
    fs.rmSync(torDir, {recursive: true, force: true});
    return stop.call(this);
  });
}
