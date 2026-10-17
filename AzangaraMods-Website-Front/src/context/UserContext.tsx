"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import fetchApi from "../utils/fetchApi";
import errorAlert from "@/utils/errorAlert";

interface UserContextProps {
    token: string | null;
    // False until the token has been read from localStorage, so pages don't send requests without it
    tokenLoaded: boolean;
    setToken: (token: string | null) => void;
    user: User | null;
    setUser: (user:User | null) => void;
    pushLevel: (level: Level) => void;
    updateLevel: (level: Level) => void;
    // Bumped when the profile picture changes so <Avatar> reloads it
    avatarVersion: number;
    bumpAvatarVersion: () => void;
}

export const UserContext = createContext<UserContextProps | null>(null);

export const UserContextProvider: React.FC<{ children: React.ReactNode}> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);

    const [token, setToken] = useState<string | null>(null);
    const [tokenLoaded, setTokenLoaded] = useState(false);

    const [avatarVersion, setAvatarVersion] = useState(0);

    useEffect(()=>{
        setToken(localStorage.getItem("token"));
        setTokenLoaded(true);
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
                    setUser(null);
                    localStorage.removeItem("token");
                }
            })();
        }
    }, [user, token]);

    const contextValue = useMemo<UserContextProps>(
        ()=>({user, setUser, token, tokenLoaded, setToken, pushLevel: (level: Level) => {
            if (user) {
                setUser({...user, levels: [...user.levels??[], level]});
            }
        }, updateLevel: (level: Level) => {
            if (user) {
                setUser({...user, levels: user.levels?.map(l => l.id === level.id ? level : l) ?? []});
            }
        }, avatarVersion, bumpAvatarVersion: () => setAvatarVersion(Date.now())}),
        [user, setUser, token, tokenLoaded, setToken, avatarVersion]
    );

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}