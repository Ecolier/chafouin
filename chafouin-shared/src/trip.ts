export interface ISchedule {
  outboundStation: string;
  inboundStation: string;
  departureDate: Date;
}

export class Schedule implements Schedule {
  constructor(
    public readonly outboundStation: string, 
    public readonly inboundStation: string,
    public readonly departureDate: Date) {
  }
  static fromPath(path: string): Schedule {
    const components = path.split(':');
    return new Schedule(components[0], components[1], new Date(components[2]));
  }
  toPath() {
    return `${this.outboundStation}:${this.inboundStation}:${this.departureDate.toLocaleDateString('fr-FR').replaceAll('/', '-')}`;
  }
}

export interface Train {
  type: string;
  name: string;
  freeSeats: number | {current: number, previous: number};
}

export interface Trips {
  schedule: Schedule;
  trains: Train[];
}