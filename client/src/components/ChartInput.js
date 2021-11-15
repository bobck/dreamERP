import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {AuthContext} from "../context/AuthContext";
import {сhartUpdateApp} from "../hooks/chartUpdate.hook";
import {useHttp} from "../hooks/http.hook";
import {useMessage} from "../hooks/message.hook";

export const ChartInputApp = (props) => {
    const authContext = useContext(AuthContext);

    const {setData} = props
    const {updateChartData} = сhartUpdateApp()

    const {request, error, clearError} = useHttp();
    const message = useMessage()
    const currentInputRef = useRef({
        date: new Date(new Date().setHours(new Date().getTimezoneOffset() / 60 * -1)).toISOString().split('T')[0],
        time_offset: new Date().getTimezoneOffset() / 60 * -1
    });
    const carNumUnitId = useRef({});
    const maponNumsForCount = useRef([]);
    const scheduleRef = useRef({});
    const [responseState, setResponseState] = useState(null);
    const [displayType, setDisplayType] = useState("boltrides");
    const [loadInputRender, setLoadInputRender] = useState(true);
    const [onlinePresent, setOnlinePresent] = useState({});

    //ошибки
    useEffect(() => {
        message(error)
        clearError()
    }, [error, message, clearError])

    //рисовка графика
    useEffect(() => {
        const response = responseState
        if (!response) return
        //console.log(displayType)
        const allArray = [...response.mileage, ...response[displayType]]
        const parsed = allArray.sort((a, b) => {
            return a.time - b.time
        }).map(point => {
            point.time = new Date(point.time)
            return point
        })
        const yInfo = `${currentInputRef.current.date} ${currentInputRef.current.driver}`
        setData({parsed, yInfo})
    }, [responseState, setData, displayType]);

    //переключение графика на имеющийся ответ
    useEffect(() => {
        for (let item of Object.keys(onlinePresent)) {
            if (onlinePresent[item]) {
                setDisplayType(item)
                break
            }
        }
    }, [onlinePresent]);


    const initialInputs = useCallback(async () => {
            setLoadInputRender(true)
            const elemTimeZone = document.querySelector('#time_offset')
            elemTimeZone.labels[0].classList.add('active')
            elemTimeZone.value = new Date().getTimezoneOffset() / 60 * -1

            const elemCar = document.querySelector('.autocomplete#car');
            const elemDriver = document.querySelector('.autocomplete#driver');
            const elemsDate = document.querySelectorAll('.datepicker');
            elemCar.disabled = true
            elemDriver.disabled = true
            elemsDate.disabled = true

            elemDriver.value = ''
            elemDriver.labels[0].classList.remove('active')

            const headers = {
                Authorization: `Bearer ${authContext.token}`
            }

            const schedulePromise = request('/api/workflow/schedule?' + new URLSearchParams({
                city: authContext.currentCity
            }), 'GET', null, headers)

            const driversPromise = request('/api/workflow/drivers?' + new URLSearchParams({
                city: authContext.currentCity
            }), 'GET', null, headers)

            const carsPromise = request('/api/workflow/cars', 'GET',
                null, headers)

            //авто
            const carList = await carsPromise
            const autocompleteData = {}
            for (let car of carList.result) {
                autocompleteData[car.number] = null;
            }
            for (let car of carList.result) {
                carNumUnitId.current[car.number] = car.unit_id;
            }

            maponNumsForCount.current = Object.keys(carNumUnitId.current).map(num => num.slice(2, 6))


            const elemCarData = {
                data: autocompleteData,
                onAutocomplete: e => {
                    // возможно сделать подбор айди и только для автокомплита, на инпут нет хендлера
                    let unit_id = carNumUnitId.current[e]
                    currentInputRef.current = {...currentInputRef.current, car: unit_id}
                    setResponseState(null)
                }
            }
            window.M.Autocomplete.init(elemCar, elemCarData);
            elemCar.disabled = false

            //водители
            const driversList = await driversPromise
            const elemDriverData = {
                data: driversList.result,
                onAutocomplete: e => {
                    currentInputRef.current = {...currentInputRef.current, driver: e}
                    const driverFromRefSchedule = scheduleRef.current[e]
                    //прописать авто если есть водитель
                    if (driverFromRefSchedule) {
                        const numbersOnlySchedule = driverFromRefSchedule.slice(0,4)
                        for (let maponNum of Object.keys(carNumUnitId.current)) {
                            if (maponNum.slice(2, 6) === numbersOnlySchedule) {
                                elemCar.value = maponNum
                                elemCar.labels[0].classList.add('active')
                                let unit_id = carNumUnitId.current[maponNum]
                                currentInputRef.current = {...currentInputRef.current, car: unit_id}
                                const length = maponNumsForCount.current.filter(num => num === numbersOnlySchedule).length
                                document.querySelector('.helper-text#drivers-cars-length').innerText = `Similar cars ${length} (Schedule: ${driverFromRefSchedule})`
                                break;
                            }
                        }
                    } else {
                        elemCar.value = ''
                        elemCar.labels[0].classList.remove('active')
                        document.querySelector('.helper-text#drivers-cars-length').innerText = ``
                    }
                    setResponseState(null)
                }
            }
            window.M.Autocomplete.init(elemDriver, elemDriverData);
            elemDriver.disabled = false

            //дата
            const elemDataOptions = {
                autoClose: true,
                format: 'yyyy-mm-dd',
                defaultDate: new Date(),
                setDefaultDate: true,
                firstDay: 1,
                maxDate: new Date(),
                yearRange: 2,
                showDaysInNextAndPreviousMonths: true,
                onSelect: (e) => {
                    const date = new Date(new Date(e).setHours(new Date().getTimezoneOffset() / 60 * -1)).toISOString().split('T')[0]
                    currentInputRef.current = {...currentInputRef.current, date};
                    setResponseState(null)
                }
            }
            window.M.Datepicker.init(elemsDate, elemDataOptions);
            elemsDate.disabled = false

            //график
            const schedule = await schedulePromise;
            scheduleRef.current = schedule.result;

            setLoadInputRender(false)
        },
        [authContext.token, authContext.currentCity, request]
    );

    useEffect(() => {
        //TODO баг, если не дожидаясь завершения initialInputs уйти со страницы, то все сломается((
        initialInputs()
    }, [initialInputs, authContext.currentCity]);

    const schedulePosition = useRef(-1);

    const render = useCallback(
        async () => {
            setOnlinePresent({})
            await updateChartData(currentInputRef.current, setResponseState, responseState, setLoadInputRender, setOnlinePresent)
        },
        [responseState, updateChartData],
    );

    const controlPanel = useCallback(
        (event) => {
            // console.log(event.keyCode)
            if ([37, 39].includes(event.keyCode)) {
                const datePickElem = document.querySelector('.datepicker')
                const curentDate = new Date(datePickElem.value)
                const getDate = curentDate.getDate();
                if (event.keyCode === 37) curentDate.setDate(getDate - 1)
                if (event.keyCode === 39) curentDate.setDate(getDate + 1)
                if (curentDate > new Date().getTime()) curentDate.setDate(getDate)
                const date = new Date(curentDate).toISOString().split('T')[0]
                currentInputRef.current = {...currentInputRef.current, date};
                datePickElem.value = date;
                setResponseState(null)
            }

            if ([38, 40].includes(event.keyCode)) {
                event.preventDefault()
                const scheduleKeys = Object.keys(scheduleRef.current)
                if (event.keyCode === 38) schedulePosition.current = schedulePosition.current - 1
                if (event.keyCode === 40) schedulePosition.current = schedulePosition.current + 1
                if (schedulePosition.current < 0) schedulePosition.current = 0
                if (schedulePosition.current > scheduleKeys.length - 1) schedulePosition.current = scheduleKeys.length - 1
                const elemDriver = document.querySelector('.autocomplete#driver')
                const driver = scheduleKeys[schedulePosition.current];
                elemDriver.value = driver
                currentInputRef.current = {...currentInputRef.current, driver};
                elemDriver.labels[0].classList.add('active')

                const carFromRefSchedule = scheduleRef.current[driver]
                // console.log(carFromRefSchedule.slice(0,4))
                for (let maponNum of Object.keys(carNumUnitId.current)) {
                    const numbersOnlySchedule = carFromRefSchedule.slice(0,4)
                    if (maponNum.slice(2, 6) === numbersOnlySchedule) {
                        const elemCar = document.querySelector('.autocomplete#car');
                        elemCar.value = maponNum
                        elemCar.labels[0].classList.add('active')
                        let unit_id = carNumUnitId.current[maponNum]
                        currentInputRef.current = {...currentInputRef.current, car: unit_id}
                        const length = maponNumsForCount.current.filter(num => num === numbersOnlySchedule).length
                        document.querySelector('.helper-text#drivers-cars-length').innerText = `Similar cars ${length} (Schedule: ${carFromRefSchedule})`
                        // console.log('this.num.count', length)
                        break;
                    }

                }
                setResponseState(null)
            }

            if ([16].includes(event.keyCode) && !loadInputRender) {
                render();
                return
            }
        },
        [loadInputRender, render],
    );


    useEffect(() => {
        window.addEventListener('keydown', controlPanel);
        return () => {
            window.removeEventListener('keydown', controlPanel);
        };
    }, [controlPanel]);


    const inputHandler = (event) => {
        if (event.target.name === 'car') {
            // console.log(event.target.value)
            // console.log(carNumUnitId.current[event.target.value])
            event.target.value = carNumUnitId.current[event.target.value]
        }

        if (event.target.name === 'driver') {
            document.querySelector('.helper-text#drivers-cars-length').innerText = ``
        }

        currentInputRef.current = {...currentInputRef.current, [event.target.name]: event.target.value}
        setResponseState(null)
    }


    const switchType = (e) => {
        setDisplayType(e.target.id)
    }

    return (
        <>
            <div className="col s12 m4 l3">
                <div className="input-field">
                    <i className="small material-icons prefix ">access_time</i>
                    <input
                        //TODO сделать только цифры и значение по умолчанию
                        type="number"
                        id="time_offset"
                        name="time_offset"
                        className="validate"
                        onChange={inputHandler}
                    />
                    <label htmlFor="time_offset">Time zone</label>
                </div>
                <form
                    id="types"
                    action="#">
                    <p>
                        <label>
                            <input
                                onChange={switchType}
                                id="boltrides"
                                name="group1"
                                type="radio"
                                disabled={!onlinePresent?.boltrides}
                                checked={displayType === 'boltrides'}
                            />
                            <span>Trips Bolt</span>
                        </label>
                    </p>
                    <p>
                        <label>
                            <input
                                onChange={switchType}
                                id="boltonlineflow"
                                name="group1"
                                type="radio"
                                disabled={!onlinePresent?.boltonlineflow}
                                checked={displayType === 'boltonlineflow'}
                            />
                            <span>Online Bolt</span>
                        </label>
                    </p>
                    <p>
                        <label>
                            <input
                                onChange={switchType}
                                id="uklonrides"
                                name="group1"
                                type="radio"
                                disabled={!onlinePresent?.uklonrides}
                                checked={displayType === 'uklonrides'}
                            />
                            <span>Trips Uklon</span>
                        </label>
                    </p>
                </form>
            </div>
            <div className="col s12 m8 l9">
                <div className="row no-margin-bot">
                    <div className="col s12 l5">
                        <div className="input-field">
                            <i className="small material-icons prefix ">directions_car</i>
                            <input
                                type="text"
                                id="car"
                                name="car"
                                className="autocomplete"
                                // onChange={inputHandler}
                            />
                            <label htmlFor="car">Car</label>
                        </div>
                    </div>
                    <div className="col s12 l7">
                        <div className="input-field">
                            <i className="small material-icons prefix ">face</i>
                            <input
                                type="text"
                                id="driver"
                                name="driver"
                                className="autocomplete"
                                onChange={inputHandler}
                            />
                            <label htmlFor="driver">Driver</label>
                            <span
                                className="helper-text"
                                id="drivers-cars-length"
                            />
                        </div>
                    </div>
                </div>
                <div className="row no-margin-bot">
                    <div className="col s12 m12 l12">
                        <input
                            type="text"
                            id="date"
                            name="date"
                            className="datepicker center"/>
                        <button
                            className="btn blue-grey darken-3 btn-space flow-btn"
                            onClick={render}
                            disabled={loadInputRender}
                            onChange={inputHandler}
                        >Update
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
