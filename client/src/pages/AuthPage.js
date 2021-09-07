import {Link} from "react-router-dom";
import {useHttp} from "../hooks/http.hook";
import React, {useContext, useEffect, useState} from 'react';
import {useMessage} from "../hooks/message.hook";
import {AuthContext} from "../context/AuthContext";


export const AuthPage = () => {
    const authContext = useContext(AuthContext);

    const message = useMessage()
    const {loading, request, error, clearError} = useHttp();

    const [form, setForm] = useState({
        email: '', password: '', username: '', invite: ''
    })
    const changeHandler = event => {
        setForm({...form, [event.target.name]: event.target.value})
    }

    const loginHandler = async () => {
        try {
            const data = await request('/api/auth/login', 'POST', {...form})
            authContext.login(data.token, data.userId,data.userName,data.userMail)
            authContext.setAuthenticated(true)
        } catch (e) {
        }
    }

    useEffect(() => {
        message(error)
        clearError()
    }, [error, message, clearError])


    return (
        <div className="row">
            <div className="col s8 offset-s2">
                <h1 align="center">DreamERP</h1>
                <div className="card blue-grey darken-1">
                    <div className="card-content white-text">
                        <span className="card-title" align="center">Authorisation</span>
                        <div>
                            <div className="input-field">
                                <input
                                    id="email"
                                    type="text"
                                    name="email"
                                    className="input-focus-color"
                                    onChange={changeHandler}

                                />
                                <label htmlFor="email">Email</label>
                            </div>
                            <div className="input-field">
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    className="input-focus-color"
                                    onChange={changeHandler}
                                />
                                <label htmlFor="password">Password</label>
                            </div>
                        </div>
                    </div>
                    <div className="card-action">
                        <button
                            className="btn blue-grey darken-3 btn-space"
                            onClick={loginHandler}
                            disabled={loading}
                        >Login
                        </button>
                        <Link to="/register" className="btn grey">Registration</Link>
                    </div>
                </div>
            </div>
        </div>

)
}