const onTrip = '#008000';
const toClient = '#81bd81';
const empty = '#848484'

const dispatcherLog = (queryResults, driverName, time_offset) => {
    const delayMinutes = 7 * 60000;

    try {
        const colorArray = []
        const queryResultsLength = queryResults.length;

        for (let [i, row] of queryResults.entries()) {
            const driverRowPosition = row.Data.indexOf(driverName);
            const onlineData = row.Data.slice(driverRowPosition, driverRowPosition + driverName.length + 10).slice(-3)
            const color = (onlineData === '777') ? onTrip : toClient
            const time = new Date(row['Created_Time'].value.replace('Z', '')).getTime();
            colorArray.push({
                time,
                lineColor: color
            })
            //обработка последней точки
            if (i === queryResultsLength - 1) {
                const minutes = new Date(time).getMinutes()
                colorArray.push({
                    time: new Date(time).setMinutes(minutes + 1),
                    lineColor: empty
                })
                continue;
            }

            //разрыв между точками
            const nextTime = queryResults[i + 1]['Created_Time'].value.replace('Z', '');
            const dif = new Date(nextTime) - time
            if (dif > delayMinutes) {
                const minutes = new Date(time).getMinutes()
                // console.log(new Date(time),new Date(nextTime),new Date(time).setMinutes(minutes + 5))
                colorArray.push({
                    time: new Date(time).setMinutes(minutes + 5),
                    lineColor: empty
                })
            }
        }
        return colorArray
    } catch (e) {
        throw {message: `dispatcherLog: ${e.message}`}
    }
}

const boltRidesLog = (queryResults) => {
    const queryResultsLength = queryResults.length;
    const colorArray = []

    const withoutMix = queryResults.map(ride => {
        const date = ride.Csv_date.value;
        const start = (ride.Asked.includes('-')) ? new Date(ride.Asked).getTime() : new Date(`${date} ${ride.Asked}`).getTime();
        const end = (ride.Payment_confirmed.includes('-')) ? new Date(ride.Payment_confirmed).getTime() : new Date(`${date} ${ride.Payment_confirmed}`).getTime();
        return {start, end}
    }).sort((a, b) => {
        return a.start - b.start
    }).map((ride, i, arr) => {
        if (i === queryResultsLength - 1) return ride
        if (ride.end > arr[i + 1].start) delete ride.end
        return ride
    })

    for (let ride of withoutMix) {
        colorArray.push({
            time: ride.start,
            lineColor: onTrip
        })

        if (!ride.end) continue;

        colorArray.push({
            time: ride.end,
            lineColor: empty
        })
    }

    return colorArray
}

const uklonRidesLog = (queryResults, time_offset) => {
    if (!time_offset) time_offset = (new Date().getTimezoneOffset() / 60) * -1
    const queryResultsLength = queryResults.length;
    const colorArray = []

    try {

        const withoutMix = queryResults.map((ride, i, arr) => {
            if (i === queryResultsLength - 1) return ride
            if (ride.completed_at > arr[i + 1].offer_accepted_at) delete ride.completed_at
            return ride
        })

        for (let ride of withoutMix) {
            colorArray.push({
                time: ride.offer_accepted_at * 1000,
                lineColor: onTrip
            })

            if (!ride.completed_at) continue;

            colorArray.push({
                time: ride.completed_at * 1000,
                lineColor: empty
            })
        }
        return colorArray
    } catch (e) {
        throw {message: `uklonRidesLog: ${e.message}`}
    }
}


// const uklonRidesLog = (queryResults, time_offset) => {
//     if (!time_offset) time_offset = (new Date().getTimezoneOffset() / 60) * -1
//     const hoursOffset = time_offset * -1 * 60 * 60000;
//     const toClient = 5;
//
//     try {
//         const colorArray = []
//         for (let ride of queryResults) {
//             const startTime = new Date(ride['Created_Time'].value).getTime() + hoursOffset;
//             colorArray.push({
//                 time: startTime - (toClient * 60000),
//                 lineColor: onTrip,
//                 distance: ride.distance
//             })
//             const tripShift = (ride.distance * 2) * 60000
//             colorArray.push({
//                 time: startTime + tripShift,
//                 lineColor: empty
//             })
//         }
//         return colorArray
//     } catch (e) {
//         throw {message: `uklonRidesLog: ${e.message}`}
//     }
// }

const parseDriversList = (queryResults) => {
    const field = 'First_Name';
    const out = {}
    for (let driver of queryResults) {
        out[driver[field]] = null
    }
    return out
}

const parseSchedule = (queryResults) => {
    const nameField = 'First_Name';
    const numberField = 'Reg_Number';

    // queryResults.sort((a, b) => {
    //     return parseInt(a[numberField]) - parseInt(b[numberField])
    // })

    const out = {}
    for (let row of queryResults) {
        out[row[nameField].replace('(UK) ', '')] = row[numberField]//parseInt(row[numberField])
    }
    return out
}

module.exports = {dispatcherLog, boltRidesLog, uklonRidesLog, parseDriversList, parseSchedule}