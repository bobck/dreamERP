import React, {useContext, useEffect} from 'react'
import {NavLink, useHistory} from "react-router-dom";
import {AuthContext} from "../context/AuthContext";

export const Navbar = () => {
    const history = useHistory()
    const authContext = useContext(AuthContext);

    const logoutHandler = event => {
        event.preventDefault();
        authContext.logout();
        authContext.setAuthenticated(false)
        history.push('/')
    }

    useEffect(() => {
        const elems = document.querySelectorAll('select');
        window.M.FormSelect.init(elems);

        const elemsq = document.querySelectorAll('.sidenav');
        window.M.Sidenav.init(elemsq);
    },[]);

//TODO допилить контекст уже может писать текущий город в него. нужно добавить второй контекст да и стиль выбора допилить
    return (
        <>
            <nav className="blue-grey darken-1">
                <a href="/" data-target="slide-out" className="sidenav-trigger"><i
                    className="material-icons">menu</i></a>
                <div className="nav-wrapper blue-grey darken-1">
                    <span className="brand-logo">DreamERP</span>
                </div>
            </nav>
            <ul id="slide-out" className="sidenav sidenav-fixed">
                <li>
                    <div className="user-view blue-grey darken-1">
                        <span className="white-text name">{authContext.userName}</span>
                        <span className="white-text email">{authContext.userMail}</span>
                        <select
                            className="white-text"
                            onChange={(e) => {
                                authContext.setCurrentCity(e.target.value)
                            }}
                            defaultValue={'0'}>
                            {authContext.userCity.length > 0 && authContext.userCity.map((name, index) => {
                                return (
                                    <option value={name} key={index}>{name}</option>
                                )
                            })}
                            {authContext.userCity.length === 0 && <option value="0">No access to cities</option>}
                        </select>
                    </div>
                </li>
                <li>
                    <NavLink to="/workflow">Workflow</NavLink>
                </li>
                {authContext.userRole === 'Admin' &&
                <li>
                    <NavLink to="/admin">Admin</NavLink>
                </li>
                }
                <li>
                    <div className="divider"></div>
                </li>

                <li><a href='/' onClick={logoutHandler}>Logout</a></li>
                {/*Current city is: {authContext.currentCity}*/}
            </ul>
        </>
    )
}