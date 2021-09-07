const dayPoints = (historyArray, time_offset) => {
    if (!time_offset) time_offset = (new Date().getTimezoneOffset() / 60) * -1
    const [firstPoint] = historyArray
    const [start] = firstPoint.data.units

    return historyArray.map(point => {
        const [unit] = point.data.units;
        const hours = new Date(unit.mileage.gmt).getHours();

        return {
            time: new Date(unit.mileage.gmt).setHours(hours + time_offset),
            kilometres: unit.mileage.value - start.mileage.value
        }
    })
}

module.exports = {dayPoints}//