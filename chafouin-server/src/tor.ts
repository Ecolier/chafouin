export const torrc = (socksPort: number, controlPort: number, count: number) => `
SocksPort ${socksPort}
ControlPort ${controlPort}
DataDirectory /var/lib/tor${count}
`;