"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import fetchApi from "../utils/fetchApi";

interface UserContextProps {
    user: User | null;
    setUser: (user:User | null) => void;
}

export const UserContext = createContext<UserContextProps | null>(null);

export const UserContextProvider: React.FC<{ children: React.ReactNode}> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(()=>{
        if (user) return;
        const token = localStorage.getItem("token");
        if (token) {
            (async ()=>{
                let res = await fetchApi(
                "/users/@me",
                token
                );
                if (res.ok) {
                    setUser(await res.json());
                }
            })();
        }
    }, [user]);

    const contextValue = useMemo<UserContextProps>(
        ()=>({user, setUser}),
        [user, setUser]
    );

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}