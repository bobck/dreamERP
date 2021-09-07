import {useHttp} from "../hooks/http.hook";
import {useMessage} from "../hooks/message.hook";
import {useContext, useEffect} from "react";
import {AuthContext} from "../context/AuthContext";


export const сhartUpdateApp = () => {
    const {request, error, clearError} = useHttp();
    const message = useMessage()

    useEffect(() => {
        message(error)
        clearError()
    }, [error, message, clearError])
    const authContext = useContext(AuthContext);

    const updateChartData = async ({
                                       date,
                                       driver,
                                       car
                                   },
                                   setResponseState, responseState, setLoadInputRender, setOnlinePresent) => {
        if (responseState) return responseState
        try {
            const step = '3'
            if (!date || !driver || !car) {
                setResponseState(false)
                setLoadInputRender(false)
                return
            }
            setLoadInputRender(true)
            const headers = {
                Authorization: `Bearer ${authContext.token}`
            }
            const promiseArray = []
            promiseArray.push(
                request('/api/workflow/boltonlineflow', 'POST',
                    {city: authContext.currentCity, driver, date}
                    , headers))
            promiseArray.push(
                request('/api/workflow/mileage', 'POST',
                    {unit_id: car, step, date}
                    , headers))
            promiseArray.push(
                request('/api/workflow/boltrides', 'POST',
                    {city: authContext.currentCity, driver, date}
                    , headers))
            promiseArray.push(
                request('/api/workflow/uklonrides', 'POST',
                    {city: authContext.currentCity, driver, date}
                    , headers))

            const response = {}

            for (let responsePromise of promiseArray) {
                let oneResponse = await responsePromise;
                response[oneResponse.type] = oneResponse.result
                response[oneResponse.type].type = oneResponse.type
                response[oneResponse.type].success = Boolean(oneResponse?.result?.length)
            }

            setOnlinePresent({
                [response.boltrides.type]: response.boltrides.success,
                [response.boltonlineflow.type]: response.boltonlineflow.success,
                [response.uklonrides.type]: response.uklonrides.success,
            })

            setResponseState(response)
        } catch (e) {
        } finally {
            setLoadInputRender(false)
        }
    }


    return {updateChartData}
}