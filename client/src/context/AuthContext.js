import {createContext} from "react";

function noop() {
}

export const AuthContext = createContext({
    userName:null,
    userMail:null,
    login:noop,
    logout:noop,
    token: null,
    userId: null,
    isAuthenticated:false,
    setAuthenticated:noop,
    language: "en",
    setLanguage: noop
})
