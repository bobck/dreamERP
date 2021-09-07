import React, {useEffect, useState} from 'react'
import {BrowserRouter as Router} from 'react-router-dom'
import {UseRoutes} from './routes'
import {AuthContext} from './context/AuthContext'
import {useAuth} from './hooks/auth.hook'
import jwt_decode from "jwt-decode"
import 'materialize-css'

function App() {

    const {login, logout, token, userId,checkHandler,routesLoaded} = useAuth()
    const [isAuth, setAuth] = useState(false)
    const [currentCity, setCurrentCity] = useState(null)

    useEffect(() => {
        checkHandler(setAuth)
    }, [checkHandler]);


    if (!routesLoaded) {
        return ''
    }

    const initState = {
        login: login,
        logout: logout,
        token: token,
        userId: userId,
        isAuthenticated: isAuth,
        setAuthenticated: setAuth,
        setCurrentCity: setCurrentCity
    }

    if (token) {
        const decoded = jwt_decode(token);
        initState.userMail = decoded.userMail
        initState.userName = decoded.userName
        initState.userRole = decoded.userRole
        initState.userCity = decoded.userCity
        if (decoded.userCity.length === 0) initState.currentCity = null;
        if (decoded.userCity.length > 0 && currentCity) initState.currentCity = currentCity;
        if (decoded.userCity.length > 0 && !currentCity) initState.currentCity = decoded.userCity[0]
    }

    return (
        <AuthContext.Provider value={initState}>
            <Router>
                <UseRoutes/>
            </Router>
        </AuthContext.Provider>
    )
}

export default App