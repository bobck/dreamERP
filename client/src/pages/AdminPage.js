import React, {useCallback, useContext, useEffect, useState} from 'react';
import {AuthContext} from "../context/AuthContext";
import {useHttp} from "../hooks/http.hook";
import {useMessage} from "../hooks/message.hook";
import {UserList} from "../components/Userlist";

export const AdminPage = () => {
    const message = useMessage()

    const [isLoading, setIsLoading] = useState(true)

    const [users, setUsers] = useState([])
    const {loading, request, error, clearError} = useHttp()
    const {token} = useContext(AuthContext)

    const fetchUsers = useCallback(async () => {
        try {
            const fetched = await request('/api/admin/users', 'GET', null, {
                Authorization: `Bearer ${token}`
            })
            setUsers(fetched)
            setIsLoading(false)
        } catch (e) {
        }
    }, [token, request])

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers])

    useEffect(() => {
        message(error)
        clearError()
    }, [error, message, clearError])


    if (loading || isLoading) {
        return 'LOADING USERS'
    }

    return (
        <>
            {!loading && <UserList users={users}/>}
        </>
    )
}