export const areTripQueriesEqual = (a, b) => (a.outboundStation === b.outboundStation &&
    a.inboundStation === b.inboundStation &&
    a.departureDate === b.departureDate);
