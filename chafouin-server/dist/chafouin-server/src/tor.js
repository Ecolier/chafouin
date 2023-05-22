export const torrc = (socksPort, controlPort, count) => `
SocksPort ${socksPort}
ControlPort ${controlPort}
DataDirectory /usr/local/etc/tor/tor${count}
`;
