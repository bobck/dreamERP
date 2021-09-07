import React, {useEffect, useState} from 'react';
import {useHttp} from "../hooks/http.hook";
import {useMessage} from "../hooks/message.hook";
import {useHistory} from "react-router-dom";


export const RegisterPage = () => {

    const history = useHistory()

    const message = useMessage()

    const {loading, request, error, clearError} = useHttp();
    const [form, setForm] = useState({
        email: '', password: '', username: '', invite: ''
    })

    const changeHandler = event => {
        setForm({...form, [event.target.name]: event.target.value})
        //введенные данные в форму
        //console.log('form', form)
    }


    const registerHandler = async () => {
        try {
            const data = await request('/api/auth/register', 'POST', {...form})
            message(data.message);
            history.push('/')
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
                        <span className="card-title" align="center">Create user</span>
                        <div>
                            <div className="input-field">
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    className="input-focus-color"
                                    onChange={changeHandler}
                                />
                                <label htmlFor="username">Username</label>
                            </div>
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
                            <div className="input-field">
                                <input
                                    id="invite"
                                    type="text"
                                    name="invite"
                                    className="input-focus-color"
                                    onChange={changeHandler}
                                />
                                <label htmlFor="invite">Invite code</label>
                            </div>
                        </div>
                    </div>
                    <div className="card-action">
                        <button
                            className="btn grey"
                            onClick={registerHandler}
                            disabled={loading}
                        >Registration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}