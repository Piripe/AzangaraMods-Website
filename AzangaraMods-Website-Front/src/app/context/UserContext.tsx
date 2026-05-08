"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import fetchApi from "../utils/fetchApi";

interface UserContextProps {
    token: string | null;
    setToken: (token: string | null) => void;
    user: User | null;
    setUser: (user:User | null) => void;
    pushLevel: (level: Level) => void;
}

export const UserContext = createContext<UserContextProps | null>(null);

export const UserContextProvider: React.FC<{ children: React.ReactNode}> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);

    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

    useEffect(()=>{
        if (user) return;
        if (token) {
            (async ()=>{
                let res = await fetchApi(
                "/users/@me",
                token
                );
                if (res.ok) {
                    setUser(await res.json());
                } else {
                    setToken(null);
                    localStorage.removeItem("token");
                }
            })();
        }
    }, [user, token]);

    const contextValue = useMemo<UserContextProps>(
        ()=>({user, setUser, token, setToken, pushLevel: (level: Level) => {
            if (user) {
                setUser({...user, levels: [...user.levels??[], level]});
            }
        }}),
        [user, setUser, token, setToken]
    );

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}