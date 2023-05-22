export const torrc = (socksPort: number, controlPort: number, count: number) => `
SocksPort ${socksPort}
ControlPort ${controlPort}
DataDirectory /usr/local/etc/tor/tor${count}
`;