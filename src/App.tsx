// Мы ожидаем, что Вы исправите синтаксические ошибки, сделаете перехват возможных исключений и улучшите читаемость кода.
// А так же, напишите кастомный хук useThrottle и используете его там где это нужно.
// Желательно использование React.memo и React.useCallback там где это имеет смысл.
// Будет большим плюсом, если Вы сможете закэшировать получение случайного пользователя.
// Укажите правильные типы.
// По возможности пришлите Ваш вариант в https://codesandbox.io

import React, { MouseEventHandler, useRef, useState } from "react";

const THROTTLE_MS = 600
const URL = "https://jsonplaceholder.typicode.com/users";

type Company = {
  bs: string;
  catchPhrase: string;
  name: string;
};

type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  username: string;
  website: string;
  company: Company;
  address: any
};

interface IButtonProps {
  onClick: MouseEventHandler;
}

function Button({ onClick }: IButtonProps): JSX.Element {
  return (
    <button type="button" onClick={onClick}>
      get random user
    </button>
  );
}

interface IUserInfoProps {
  user: User;
}

function UserInfo({ user }: IUserInfoProps): JSX.Element {
  return (
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Phone number</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{user.name}</td>
          <td>{user.phone}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * 
 * @param fn - обработчик, подлежащий пропуску вызовов;
 * @param ms - время игнорирования вызова обработчика;
 * @returns обработчик с пропуском вызовов;
 */
const useThrottle = (fn: MouseEventHandler, ms: number = 600) => {
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null)  // таймер пропуска вызова;

  const withThrottle: MouseEventHandler = (args) => {
    if (timerId.current) {  // если время пропуска не истекло;
      return                // ничего не делаем;
    }

    // перед очередным вызовом обработчика, запускаем таёмер пропуска;
    timerId.current = setTimeout(() => {
      timerId.current = null      // по истечении таёмера, он удалит ссылку на себя;
    }, ms)

    fn(args)    // вызываем обработчик;
  }

  return withThrottle
}

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null)           // пользователь для отображения, просто объект типа User, не набор;
  const [hasFetchError, setHasFetchError] = useState(false)     // флаг ошибки получения пользователя;

  const cashe = useRef<Map<number, User>>(new Map())            // кэш пользователей - набор c ключом id;

  // получение id вынесено в отдельную функцию;
  const generateRandomId = () => Math.floor(Math.random() * (10 - 1)) + 1

  // функция кэширования данных, кэш живёт до перезагрузки страницы;
  const cashedReceiveRandomUser = async (id: number) => {
    if (cashe.current.has(id)) {        // если в кэше есть нужные данные;
      return cashe.current.get(id)!            // вернём их;
    }

    const _user = await receiveRandomUser(id) // в противном случае запросим с сервера;
    cashe.current.set(id, _user)              // и сохраним в кэш;
    return _user                              // вернём полученные данные;
  }

  // возвращает пользователя с сервера, устанавливает флаг ошибки, остальная логика вынесена в отдельные функции;
  const receiveRandomUser = async (id: number) => {
    setHasFetchError(false)                           // сброс флага ошибки перед началом заппроса;
    
    try {
      const response = await fetch(`${URL}/${id}`); 
      return (await response.json()) as User;
    } catch (e) {
      // неудачный зщапрос или ошибка json, выставляем флаг ошибки;
      setHasFetchError(true)
      throw e
    }
  };

  // обработчик клика;
  const handleButtonClick = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.stopPropagation();

    const id = generateRandomId() // генерируем новый id;
    try {
      const user = await cashedReceiveRandomUser(id);  // пытаемся получить данные;
      // данные получены успешно;
      setUser(user)
    } catch (e) {
      // ошибка получения данных;
      console.error(e);
      setUser(null)     // сбрасываем пользователя;
    }
  }

  // обработчки клика с пропуском повторов;
  const throttledHandleButtonClick = useThrottle(handleButtonClick, THROTTLE_MS)

  return (
    <div>
      <header>Get a random user</header>
      <Button onClick={throttledHandleButtonClick} />
      {!hasFetchError && user && <UserInfo user={user} /> }
      {hasFetchError && <div>Ошибка получения пользователя...</div> }
      {!hasFetchError && !user && <div>Нет пользователя</div> }
    </div>
  );
}

export default App;