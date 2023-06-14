import { config } from 'dotenv';
config();

import { SocksProxyAgent } from 'socks-proxy-agent';
import createWorker, { Worker } from './worker.js';

import fs from 'fs';
import path from 'path';
import { exec as execSync } from 'child_process';

import { logging } from '@chafouin/common';
const logger = logging('tor-worker');

import { promisify } from 'util';
const exec = promisify(execSync);

const dataDirectory = process.env.TOR_DATA_DIR;
const configDirectory = process.env.TOR_CONFIG_DIR;
if (!dataDirectory || !configDirectory) {
  throw Error('Environment variables TOR_CONFIG_DIR and TOR_DATA_DIR must be set')
}

export const torrc = (socksPort: number, controlPort: number, agentId: string) => `
SocksPort ${ socksPort }
ControlPort ${ controlPort }
DataDirectory ${ dataDirectory }/${ agentId }
`;

type Agents = { [workerId: string]: SocksProxyAgent };

let agents: Agents = {};

export default async <T extends unknown[], U extends unknown[]> (
  agentId: string, 
  start: (this: Worker<T, U>, agent: SocksProxyAgent, ...args: T) => void,
  stop: (this: Worker<T, U>) => void
  ) => {
    const process = agentId.replaceAll(':', '_');
    const torDir = path.resolve(path.join(configDirectory, process));
    const torrcFileDir = path.resolve(path.join(torDir, 'torrc'));
    let socksPort = 0, controlPort = 0;
    if (fs.existsSync(torrcFileDir)) {
      const torrc = fs.readFileSync(torrcFileDir).toString('utf-8');
      socksPort = parseInt(/SocksPort (\d*)/.exec(torrc)?.[1] ?? '0');
      controlPort = parseInt(/ControlPort (\d*)/.exec(torrc)?.[1] ?? '0');
    } else {
      const boundaries = (start: number, arr: number[], fill: number) => {
        const size = (arr.length > 0 ? Math.max(...arr) : start) - start + (fill + 1);
        return [...Array(size).keys()].map(n => n + start);
      }
      const pick = (arr: number[], exclude: number[]) => {
        return arr.filter(n => !exclude.includes(n));
      }
      const unavailable = Object.values(agents).map(agent => agent.proxy.port)
      .reduce<number[]>((prev, port) => ([...prev, port, port + 1]), []);
      const bounds = boundaries(9050, unavailable, 2);
      const ports = pick(bounds, unavailable);
      socksPort = ports[0];
      controlPort = ports[1];
      fs.mkdirSync(torDir, { recursive: true });
      fs.writeFileSync(torrcFileDir, torrc(socksPort, controlPort, process));
      exec(`exec -a ${ process } /usr/bin/tor -f ${ torrcFileDir }`);
    }
    const agent = new SocksProxyAgent(`socks5h://127.0.0.1:${ socksPort }`);
    agents[agentId] = agent;
    return createWorker<T, U>(function (...args: T) {
      logger.info(`Start agent ${ process } with port ${ socksPort }`);
      return start.call(this, agent, ...args);
    }, async function () {
      logger.info(`Stop agent ${ process }`);
      exec(`pkill -f ${ process }`);
      fs.rmSync(torDir, { recursive: true, force: true });
      const { [agentId]: _, ...rest } = agents;
      agents = rest;
      return stop.call(this);
    });
  }
  