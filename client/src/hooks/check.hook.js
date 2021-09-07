import {useCallback, useState} from "react";
// import {AuthContext} from "../context/AuthContext";
import {useHttp} from "./http.hook";

const storageName = 'userData'


export const useCheck = () => {

    //TODO что бы изменения по доступу новым юзерам применялись без перелогина, нужно что бы тут получали с сервака новый токен
    const [routesLoaded, setroutesLoaded] = useState(false);

    const {request} = useHttp();
    const checkHandler = useCallback(async (setAuth,setToken) => {//
        try {
            const data = JSON.parse(localStorage.getItem(storageName))
            const response = await request('/api/auth/check', 'GET', null, {
                Authorization: `Bearer ${data.token}`
            })
            setAuth(true)
            setToken(response.token)
            // context.setAuthenticated(true)
        } catch (e) {
            // context.setAuthenticated(false)
            setAuth(false)
            // context.logout()
        } finally {
            setroutesLoaded(true)
        }
    }, [])// eslint-disable-line react-hooks/exhaustive-deps
    return {routesLoaded, checkHandler}
}


//
// export const useCheck = () => {
//     //TODO что бы изменения по доступу новым юзерам применялись без перелогина, нужно что бы тут получали с сервака новый токен
//     const [routesLoaded, setroutesLoaded] = useState(false);
//     const context = useContext(AuthContext);
//
//     const {request} = useHttp();
//     const checkHandler = useCallback(async () => {//
//         try {
//             const data = JSON.parse(localStorage.getItem(storageName))
//             const response = await request('/api/auth/check', 'GET', null, {
//                 Authorization: `Bearer ${data.token}`
//             })
//             context.login(response.token,response.id)
//
//             context.setAuthenticated(true)
//         } catch (e) {
//             context.setAuthenticated(false)
//            // context.logout()
//         } finally {
//             setroutesLoaded(true)
//         }
//     }, [])// eslint-disable-line react-hooks/exhaustive-deps
//     return {routesLoaded, setroutesLoaded, checkHandler}
// }
