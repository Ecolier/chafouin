import { mockTrips } from "./mock-trips";
const query = {
    outboundStation: 'tashkent',
    inboundStation: 'samarkand',
    departureDate: '2023-05-25'
};
const [updatedTrips, outdatedTrips] = mockTrips(query, 10);
const filteredTrips = updatedTrips.reduce((prev, curr) => {
    const updates = curr;
    outdatedTrips.forEach(outdatedTrips => {
        if (curr.trainId === outdatedTrips.trainId) {
            updates.freeSeats = (curr.freeSeats !== outdatedTrips.freeSeats) ? {
                current: curr.freeSeats,
                previous: outdatedTrips.freeSeats
            } : curr.freeSeats;
        }
    });
    return [
        ...prev,
        updates
    ];
}, []);
console.log(filteredTrips);
