const boltOnlineFlow = `SELECT * FROM \`up-statistics.CITY_NAME.CITY_NAME_DispatcherLog\` 
where Data like @driver and DATE(Created_Time) = @date
order by Created_Time asc`

const boltRides = `SELECT Csv_date,Asked,Payment_confirmed  
FROM \`up-statistics.CITY_NAME.CITY_NAME_trips\`
where Drivers_name like @driver
and Csv_date = @date`

const uklonRides = `SELECT Created_Time,distance 
FROM \`up-statistics.Rides_Uklon.Rides_CITY_NAME\` 
where First_Name like @driver
and status = 'completed'
and DATE(Created_Time) = @date
order by Created_Time asc
`

const driversList = `SELECT distinct First_Name FROM \`up-statistics.CITY_NAME.CITY_NAME_getDrivers\``

const scheduleToday = `SELECT LEFT(Reg_Number,4) as Reg_Number,First_Name
FROM \`up-statistics.CITY_NAME.CITY_NAME_shedule\` 
where Date = CURRENT_DATE()
order by Reg_Number asc`

module.exports = {boltOnlineFlow, boltRides, uklonRides, driversList, scheduleToday}