"use client";

import Button from "./kit/button";
import TextBox from "./kit/textbox";
import SvgIcon from "./kit/svgIcon";
import { FormEvent, useState } from "react";
import fetchApi from "../utils/fetchApi";
import useUserData from "../hooks/useUserData";
import { useRouter } from "next/navigation";
import { ErrorCodes } from "../enums";
import styles from "./authBox.module.css";

export type AuthMode = "login" | "register";

type Field = "username" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

// Server errors that belong to a single field are shown under it
const fieldOfError: Partial<Record<number, Field>> = {
    [ErrorCodes.UserSettingsUsernameInvalid]: "username",
    [ErrorCodes.UserSettingsUsernameTaken]: "username",
    [ErrorCodes.UserSettingsEmailInvalid]: "email",
    [ErrorCodes.UserSettingsEmailTaken]: "email",
    [ErrorCodes.UserSettingsPasswordTooShort]: "password",
};

const emailPattern = /^[^\s@]+@[^\s@]+$/;

function validate(mode: AuthMode, values: Record<Field, string>): FieldErrors {
    const errors: FieldErrors = {};
    const username = values.username.trim();
    const email = values.email.trim();

    if (mode === "register") {
        if (!username) errors.username = "Choose a username";
        else if (username.length < 3 || username.length > 32) errors.username = "Username must be 3 to 32 characters long";
    }

    if (!email) errors.email = "Enter your email";
    else if (mode === "register" && !emailPattern.test(email)) errors.email = "Enter a valid email address";

    if (!values.password) errors.password = mode === "register" ? "Choose a password" : "Enter your password";
    else if (mode === "register" && values.password.length < 8) errors.password = "Password must be at least 8 characters long";

    if (mode === "register" && !errors.password && values.confirmPassword !== values.password)
        errors.confirmPassword = "Passwords do not match";

    return errors;
}

export function AuthBox({mode, setMode, onSuccess=()=>{}}:{mode:AuthMode, setMode:(mode:AuthMode)=>void, onSuccess?:()=>void}) {
    const [values, setValues] = useState<Record<Field, string>>({username: "", email: "", password: "", confirmPassword: ""});
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string|null>(null);
    const [loading, setLoading] = useState(false);
    const { setUser, setToken } = useUserData();
    const router = useRouter();

    const isRegister = mode === "register";

    const setValue = (field: Field) => (value: string) => {
        setValues((v) => ({...v, [field]: value}));
        setFieldErrors((e) => ({...e, [field]: undefined}));
        setFormError(null);
    };

    const switchMode = () => {
        // Email and password stay filled in, the register-only fields remount empty
        setValues((v) => ({...v, username: "", confirmPassword: ""}));
        setFieldErrors({});
        setFormError(null);
        setMode(isRegister ? "login" : "register");
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (loading) return;

        const errors = validate(mode, values);
        setFieldErrors(errors);
        setFormError(null);
        if (Object.values(errors).some(Boolean)) return;

        setLoading(true);
        try {
            const body = isRegister
                ? {username: values.username.trim(), email: values.email.trim(), password: values.password}
                : {email: values.email.trim(), password: values.password};
            const res = await fetchApi(isRegister ? "/register" : "/login", "", "POST", JSON.stringify(body));
            const data = await res.json();

            if (res.ok) {
                const loginData = data as LoginResponseData;
                localStorage.setItem("token", loginData.token);
                setToken(loginData.token);
                setUser(loginData.user);
                onSuccess();
                router.push("/dashboard/levels");
                return;
            }

            const error = data as ErrorResponse;
            const field = fieldOfError[error.errorCode];
            if (field) setFieldErrors({[field]: error.error});
            else if (error.errorCode === ErrorCodes.AuthLoginInvalid) setFormError("Incorrect email or password.");
            else setFormError(error.error);
        } catch {
            setFormError("Couldn't reach the server. Check your connection and try again.");
        }
        setLoading(false);
    };

    return (
        <form className={styles.form} onSubmit={submit} noValidate>
            <p className={styles.intro}>
                {isRegister
                    ? "Create an account to publish your Azangara levels and share them with everyone."
                    : "Welcome back! Log in to manage your levels."}
            </p>

            <div className={styles.fields}>
                {isRegister &&
                    <TextBox placeholder="Username" icon="person" usernameEntry={true} autoComplete="username" autoFocus={true}
                        maxLength={32} supportingText="3 to 32 characters, shown on your levels" error={fieldErrors.username} onChange={setValue("username")}/>
                }
                <TextBox placeholder="Email" icon="mail" type="email" autoComplete="email" autoFocus={!isRegister}
                    maxLength={256} error={fieldErrors.email} onChange={setValue("email")}/>
                <TextBox placeholder="Password" icon="lock" password={true} autoComplete={isRegister ? "new-password" : "current-password"}
                    supportingText={isRegister ? "At least 8 characters" : undefined} error={fieldErrors.password} onChange={setValue("password")}/>
                {isRegister &&
                    <TextBox placeholder="Confirm password" icon="lock" password={true} newPassword={true}
                        error={fieldErrors.confirmPassword} onChange={setValue("confirmPassword")}/>
                }
            </div>

            {formError &&
                <div className={styles.error} role="alert">
                    <SvgIcon name="warning" size={18}/>
                    <span>{formError}</span>
                </div>
            }

            <Button type="submit" variant="filled" className={styles.submit} disabled={loading}>
                {loading
                    ? (isRegister ? "Creating account…" : "Logging in…")
                    : (isRegister ? "Create account" : "Log in")}
            </Button>

            <p className={styles.switch}>
                {isRegister ? "Already have an account?" : "New to Azangara Mods?"}
                <Button variant="text" click={switchMode} disabled={loading}>{isRegister ? "Log in" : "Create an account"}</Button>
            </p>
        </form>
    );
}
