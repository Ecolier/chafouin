function weightedRandom(specs) {
    let i, sum = 0;
    const r = Math.random();
    for (i in specs) {
        sum += specs[i];
        if (r <= sum)
            return parseInt(i);
    }
}
export function mockTrips(forQuery, count) {
    return [...new Array(2)].reduce((prev, curr, index) => [...prev, [...new Array(count)].reduce((prevTrips, currTrips, tripIndex) => {
            var _a, _b, _c;
            let type = (_b = (_a = prev[index - 1]) === null || _a === void 0 ? void 0 : _a[tripIndex]) === null || _b === void 0 ? void 0 : _b.trainType;
            if (!type) {
                type = Math.round(Math.random()) === 0 ? 'slow' : 'fast';
            }
            return [...prevTrips, Object.assign(Object.assign({}, forQuery), { trainId: `train-${tripIndex}`, trainType: type, freeSeats: (_c = weightedRandom({ 0: 0.5, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 })) !== null && _c !== void 0 ? _c : 0 })];
        }, [])
    ], []);
}
