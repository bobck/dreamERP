import React, {useContext, useEffect} from 'react'
import {AuthContext} from "../context/AuthContext";
import {useHttp} from "../hooks/http.hook";
import {useMessage} from "../hooks/message.hook";

export const UserList = ({users}) => {
    const {token} = useContext(AuthContext)
    const {request, error, clearError} = useHttp()
    const message = useMessage()


//TODO закрывать кнопку если изменений нет
    const onChipAction = (e) => {
        if (!e[0]) return;
        const userChipId = e[0].id;
        const user = users.filter(user => user._id === userChipId)
        if (user.length !== 1) return
        return document.querySelector('[id="' + userChipId + '"].btn').classList.remove('disabled')
    }

    const initChips = () => {
        const elements = document.querySelectorAll('.chips');
        for (let elem of elements) {
            const user = users.filter(user => user._id === elem.id);
            if (user.length !== 1) continue
            const userCity = user[0].city;
            const chipDataContent = userCity.map(chipCity => {
                return {tag: chipCity}
            })

            const options = {
                data: chipDataContent,
                placeholder: 'Enter a city',
                secondaryPlaceholder: '+ city',
                onChipAdd: onChipAction,
                onChipDelete: onChipAction
            }
            window.M.Chips.init(elem, options);
        }
    }
//TODO ответку на лоадинг запроса
    const updateCity = async (e) => {
        const userId = e.target.id;
        const chipCityData = document.querySelector('[id="' + userId + '"].chips').M_Chips.chipsData
        const newCity = chipCityData.map(data => data.tag)
        const payload = {newCity, userId}

        try {
            await request('/api/admin/city', 'POST', payload, {
                Authorization: `Bearer ${token}`
            })
            return document.querySelector('[id="' + userId + '"].btn').classList.add('disabled')

        } catch (e) {
        }
    }

    useEffect(() => {
        initChips();
    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        message(error)
        clearError()
    }, [error, message, clearError])

    if (!users.length) {
        return <p className="center">No users</p>
    }

    return (
        <ul className="collection">
            {users.map((user, index) => {
                return (
                    <li className="collection-item avatar" key={user._id}>
                        <div className="waves-effect waves-light btn circle disabled"
                             id={user._id}
                             onClick={e => updateCity(e)}
                        >
                            <i className="material-icons" id={user._id}>cloud</i>
                        </div>
                        <p>{user.username} {user.email}</p>
                        <p className="secondary-content">{user.role}</p>
                        <div className="chips" id={user._id}/>
                    </li>
                )
            })}
        </ul>

    )
}