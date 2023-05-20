export interface TripQuery {
  outboundStation: string;
  inboundStation: string;
  departureDate: string;
}

export const areTripQueriesEqual = (a: TripQuery, b: TripQuery) => (
  a.outboundStation === b.outboundStation &&
  a.inboundStation === b.inboundStation &&
  a.departureDate === b.departureDate
);