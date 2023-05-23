export interface TripSchedule {
  outboundStation: string;
  inboundStation: string;
  departureDate: string;
}

export interface TrainData {
  trainType: string;
  trainId: string;
}

export const tripScheduleEquals = (a: TripSchedule, b: TripSchedule) => (
  a.outboundStation === b.outboundStation &&
  a.inboundStation === b.inboundStation &&
  a.departureDate === b.departureDate
);

export type Trip = TripSchedule & TrainData & {freeSeats: number};
export type TripUpdate = TripSchedule & TrainData & {freeSeats: number | {current: number, previous: number}};