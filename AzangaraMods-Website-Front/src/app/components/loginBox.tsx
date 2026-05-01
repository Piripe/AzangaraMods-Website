"use client";

import Link from "next/link";
import Button from "./kit/button";
import TextBox from "./kit/textbox";
import { useState } from "react";
import { Console } from "console";
import fetchApi from "../utils/fetchApi";
import useUserData from "../hooks/useUserData";
import { useRouter } from "next/navigation";

export function LoginBox() {
    const [error, setError] = useState<string|null>(null);
    const [email, setEmail] = useState<string|null>(null);
    const [password, setPassword] = useState<string|null>(null);
    const [loading, setLoading] = useState(false);
    const { user, setUser } = useUserData();

  const router = useRouter();

    return (
        <>
            <div>
                <TextBox placeholder="Email" onChange={(e) => setEmail(e)}/>
                <TextBox placeholder="Password" password={true} onChange={(e) => setPassword(e)}/>
                <div>{error}</div>
                <Button disabled={loading} click={async () => {
                    setLoading(true);
                    let res = await fetchApi("/login","", "POST", JSON.stringify({email, password}));

                    let body = await res.json();
                    if (res.ok) {
                        let loginData = body as LoginResponseData;
                        console.log("Login successful: ", loginData);
                        localStorage.setItem("token", loginData.token);
                        setUser(loginData.user);
                        router.push("/dashboard");
                    } else {
                        setError((body as ErrorResponse).error);
                    }
                    setLoading(false);

                }}>{"Continue"}</Button>
            </div>
        </>
    );
}