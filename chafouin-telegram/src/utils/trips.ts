import { Train, Trips as BaseTrips } from "chafouin-shared";
import Schedule from "./schedule.js";

export class Trips implements BaseTrips {
  constructor(
    public readonly schedule: Schedule,
    public readonly trains: Train[]) {} 
  static from(trips: Trips) {
    return new Trips(new Schedule(
      trips.schedule.outboundStation,
      trips.schedule.inboundStation,
      new Date(trips.schedule.departureDate)
    ), trips.trains);
  }
  format() {
    return this.trains.reduce((prev, train) => {
      return prev + `${train.type.toUpperCase() === 'СКРСТ' ? '🚅' : '🚂'}` + 
      ` ${train.name} \\- ${typeof train.freeSeats === 'object' ?
      `${train.freeSeats.previous} to ${train.freeSeats.current}` :
      train.freeSeats} seats\\.\n`
    }, `*${this.schedule.format()}*\n\n`);
  }
} 

export default Trips;