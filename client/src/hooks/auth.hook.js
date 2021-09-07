import {useCallback, useEffect, useState} from "react";
import {useHttp} from "./http.hook";

const storageName = 'userData'
export const useAuth = () => {
    const [token, setToken] = useState(null);
    const [userId, setUserId] = useState(null);
    const login = useCallback((jwtToken, id) => {
        setToken(jwtToken)
        setUserId(id)
        localStorage.setItem(storageName, JSON.stringify({
            token: jwtToken, userId: id
        }))
    }, [])

    const logout = useCallback(() => {
        setToken(null)
        setUserId(null)
        localStorage.removeItem(storageName)
    }, [])

    useEffect(() => {
        try {
            const data = JSON.parse(localStorage.getItem(storageName))
            if (data && data.token) {
                login(data.token, data.userId)
            }
        }catch (e){
            logout()
        }

    }, [login,logout])

    const [routesLoaded, setroutesLoaded] = useState(false);

    const {request} = useHttp();
    const checkHandler = useCallback(async (setAuth) => {//
        try {
            const data = JSON.parse(localStorage.getItem(storageName))
            const response = await request('/api/auth/check', 'GET', null, {
                Authorization: `Bearer ${data.token}`
            })
            setAuth(true)
            setToken(response.token)
        } catch (e) {
            setAuth(false)
            logout()
        } finally {
            setroutesLoaded(true)
        }
    }, [logout,request])


    return {login, logout, token, userId,checkHandler,routesLoaded}
}