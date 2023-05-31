import { Schedule as BaseSchedule } from "chafouin-shared";

class Schedule extends BaseSchedule {
  format() {
    return '🔔 ' + this.departureDate.toLocaleDateString('fr-FR') +
    ` ${this.outboundStation.substring(0, 3).toUpperCase()} \\- ` +
    this.inboundStation.substring(0, 3).toUpperCase();
  }
}

export default Schedule;