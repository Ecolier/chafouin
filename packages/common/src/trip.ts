export interface ISchedule {
  outboundStation: string;
  inboundStation: string;
  departureDate: string;
}

export class Schedule implements Schedule {
  constructor(
    public readonly outboundStation: string, 
    public readonly inboundStation: string,
    public readonly departureDate: Date) {
  }

  static from(schedule: ISchedule) {
    return new Schedule(
      schedule.outboundStation,
      schedule.inboundStation,
      new Date(schedule.departureDate)
    );
  }

  static fromPath(path: string): Schedule {
    const components = path.split(':');
    return new Schedule(components[0], components[1], new Date(components[2]));
  }

  toPath() {
    return `${ this.outboundStation }:${ this.inboundStation }:${ this.departureDate.toLocaleDateString('fr-FR').replaceAll('/', '-') }`;
  }
}

export interface Train {
  type: string;
  name: string;
  freeSeats: number | { current: number, previous: number };
}

export interface Trips {
  schedule: Schedule;
  trains: Train[];
}