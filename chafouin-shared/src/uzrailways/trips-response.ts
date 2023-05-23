export interface UZRWTripsResponse {
  express: {
    hasError: boolean;
    type: string;
    showWithoutPlaces: object;
    reqExpressZK: string;
    direction?: [{
      type: string;
      trains?: [{
        date: string;
        train: [{
          length: string;
          type: string;
          number: string;
          places: {
            cars: [{
              type: string;
              freeSeats: string;
            }]
          }
        }]
      }]
    }]
  }
}