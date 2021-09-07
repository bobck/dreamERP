import React, {useContext} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom'
import {WorkFlowPage} from "./pages/WorkFlowPage";
import {AdminPage} from "./pages/AdminPage";
import {AuthPage} from "./pages/AuthPage";
import {RegisterPage} from "./pages/RegisterPage";
import {Navbar} from "./components/Navbar";
// import {useCheck} from "./hooks/check.hook";
import {AuthContext} from "./context/AuthContext";

export const UseRoutes = () => {
    const context = useContext(AuthContext);

    // const {routesLoaded, checkHandler} = useCheck(context)
    //
    // useEffect(() => {
    //     checkHandler()
    // }, [checkHandler]);

    // if (!routesLoaded) {
    //     return ''
    // }
    if (context.isAuthenticated) {
        return (
            <>
                <Navbar/>
                <main className="!container">
                    <Switch>
                        <Route path="/workflow" exact>
                            <WorkFlowPage/>
                        </Route>
                        <Route path="/admin" exact>
                            <AdminPage/>
                        </Route>
                        <Redirect to="/"/>
                    </Switch>
                </main>
            </>
        )
    }

    return (
        <Switch>
            <Route path="/" exact>
                <AuthPage/>
            </Route>
            <Route path="/register" exact>
                <RegisterPage/>
            </Route>
            <Redirect to="/"/>
        </Switch>
    )
}