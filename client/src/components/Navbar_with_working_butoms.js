import React, {useContext, useEffect, useState} from 'react'
import {NavLink, useHistory} from "react-router-dom";
import {AuthContext} from "../context/AuthContext";

export const Navbar = () => {
    const [activeRout, setActiveRout] = useState(window.location.pathname);
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
        console.log('select')
    });

//TODO допилить контекст уже может писать текущий город в него. нужно добавить второй контекст да и стиль выбора допилить
    return (
        <>
            <nav className="blue-grey darken-1">
                <div className="nav-wrapper blue-grey darken-1">
                    <span href="/" className="brand-logo">DreamERP</span>
                    <ul id="nav-mobile" className="right hide-on-med-and-down">
                        <li className={(activeRout === '/workflow') ? 'active' : ''}>
                            <NavLink
                                to="/workflow"
                                onClick={() => setActiveRout('/workflow')}>Workflow</NavLink>
                        </li>
                        <li className={(activeRout === '/admin') ? 'active' : ''}>
                            <NavLink
                                to="/admin"
                                onClick={() => setActiveRout('/admin')}>Admin</NavLink>
                        </li>
                        <li><a href='/' onClick={logoutHandler}>Logout</a></li>
                    </ul>
                </div>
            </nav>
            <ul id="slide-out" className="sidenav sidenav-fixed">
                <li><a href="#" className="active">Item 1</a></li>
                <li><a href="#">Item 2</a></li>
                <li><a href="#">Item 3</a></li>
                <li className="left">
                    <select
                        onChange={(e) => {
                            authContext.setLanguage(e.target.value)
                        }}
                        defaultValue={'0'}>
                        <option value="0" disabled>Choose city</option>
                        <option value="1">Kharkiv</option>
                        <option value="2">Lviv</option>
                        <option value="3">Odessa</option>
                    </select>
                </li>
                Current Language is: {authContext.language}
            </ul>
        </>
    )
}