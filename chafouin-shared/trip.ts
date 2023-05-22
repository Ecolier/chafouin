export interface TripSchedule {
  outboundStation: string;
  inboundStation: string;
  departureDate: string;
}

export interface TrainData {
  trainType: string;
  trainId: string;
}

export type Trip = TripSchedule & TrainData & {freeSeats: number};
export type TripUpdate = TripSchedule & TrainData & {freeSeats: number | {current: number, previous: number}};