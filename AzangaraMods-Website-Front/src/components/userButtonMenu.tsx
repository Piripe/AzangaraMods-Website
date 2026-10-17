"use client";
import { useRef } from "react";
import { useClickOutside } from "../utils/clickOutside";
import Link from "next/link";
import fetchApi from "../utils/fetchApi";
import useUserData from "../hooks/useUserData";
import styles from "./userButtonMenu.module.css";
import SvgIcon from "./kit/svgIcon";

export default function UserButtonMenu({closeCallback}:{closeCallback?:(()=>void)|undefined|null}) {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, closeCallback ?? (()=>{}));

    const {user, setUser, token, setToken} = useUserData();

    return (
        <div ref={ref} className={styles.menu}>
            <Link href="/dashboard/levels"><SvgIcon name="map" size={20}/>My Levels</Link>
            {user?.admin && <Link href="/dashboard/admin"><SvgIcon name="shield" size={20}/>Admin</Link>}
            <Link href="/dashboard/settings"><SvgIcon name="settings" size={20}/>Settings</Link>
            {/* <Link href="/dashboard">Dashboard</Link> */}
            <div className={styles.divider}/>
            <Link href="/" onNavigate={()=>{
                if (token) fetchApi("/logout", token);
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
                closeCallback?.();
            }}><SvgIcon name="logout" size={20}/>Log out</Link>
        </div>
    );
}