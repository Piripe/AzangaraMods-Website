import { useRef } from "react";
import { useClickOutside } from "../utils/clickOutside";
import Link from "next/link";
import fetchApi from "../utils/fetchApi";
import useUserData from "../hooks/useUserData";
import styles from "./userButtonMenu.module.css";

export default function UserButtonMenu({closeCallback}:{closeCallback?:(()=>void)|undefined|null}) {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, closeCallback ?? (()=>{}));

    const {setUser} = useUserData();

    return (
        <div ref={ref} className={styles.menu}>
            <Link href="/dashboard/levels">My Levels</Link>
            {/* <Link href="/dashboard">Dashboard</Link> */}
            <Link href="/" onNavigate={()=>{
                fetchApi("/logout", localStorage.getItem("token") ?? "");
                localStorage.removeItem("token");
                setUser(null);
            }}>Logout</Link>
        </div>
    );
}