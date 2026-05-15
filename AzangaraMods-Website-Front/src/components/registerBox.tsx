"use client";

import Button from "./kit/button";
import TextBox from "./kit/textbox";
import useUserData from "../hooks/useUserData";
import { useState } from "react";
import fetchApi from "../utils/fetchApi";
import { LoginBox } from "./loginBox";

export function RegisterBox() {
    const [error, setError] = useState<string|null>(null);
    const [username, setUsername] = useState<string|null>(null);
    const [email, setEmail] = useState<string|null>(null);
    const [password, setPassword] = useState<string|null>(null);
    const [loading, setLoading] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    return (
        <>
            {showLogin ?
                <LoginBox/>
            :
                <div>
                    <TextBox placeholder="Username" onChange={(e) => setUsername(e)}/>
                    <TextBox placeholder="Email" onChange={(e) => setEmail(e)}/>
                    <TextBox placeholder="Password" password={true} newPassword={true} onChange={(e) => setPassword(e)}/>
                    <div>{error}</div>
                    <Button disabled={loading} click={async () => {            
                        setLoading(true);
                        let res = await fetchApi("/register","", "POST", JSON.stringify({username, email, password}));
                
                        let body = await res.json();
                        if (res.ok) {
                            setShowLogin(true);
                        } else {
                            setError((body as ErrorResponse).error + ` (${(body as ErrorResponse).errorCode})`);
                        }
                        setLoading(false);
                
                    }}>{"Continue"}</Button>
                </div>
            }
        </>
    );
}