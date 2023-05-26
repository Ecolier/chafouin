import { SocksProxyAgent } from "socks-proxy-agent";
import createWorker from "./worker.js";

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

export default <T extends unknown[]> (agentId: string, start: (agent: SocksProxyAgent, ...args: T) => void) => {
  return createWorker<T>((...args: T) => {
    const agentsCount = Object.keys(agents).length;
    const agentPort = 9050 + (10 * agentsCount);
    const controlPort =  9051 + (10 * agentsCount);
    
    const torDir = path.resolve(path.join(configDirectory, agentId));
    const torrcFileDir = path.resolve(path.join(torDir, 'torrc'));
    
    if (!fs.existsSync(torDir)){
      fs.mkdirSync(torDir);
    }
    
    fs.writeFileSync(torrcFileDir, torrc(agentPort, controlPort, agentId));
    
    exec(`tor -f ${torrcFileDir}`);
    const agent = new SocksProxyAgent(`socks5h://127.0.0.1:${agentPort}`);
    agents[agentId] = agent;
    
    return start(agent, ...args);
  });
}
