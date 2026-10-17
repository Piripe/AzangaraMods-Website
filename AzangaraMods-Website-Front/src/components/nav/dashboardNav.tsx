"use client";
import Link from "next/link";
import styles from "./navbar.module.css";
import { usePathname } from "next/navigation";
import SvgIcon from "../kit/svgIcon";
import useUserData from "@/hooks/useUserData";

export function DashboardNav() {
    const pathname = usePathname();
    const {user} = useUserData();
    return (
        <nav className={styles.navBar}>
            <Link href="/"><SvgIcon name="home" size={20}/>Home</Link>
            <Link href="/levels"><SvgIcon name="search" size={20}/>Levels</Link>
            {/* <Link className={pathname === "/dashboard" ? styles.highlightNav : undefined} href="/dashboard">Dashboard</Link> */}
            <Link className={pathname.startsWith("/dashboard/levels") ? styles.highlightNav : undefined} href="/dashboard/levels"><SvgIcon name="map" size={20}/>My Levels</Link>
            {user?.admin && <Link className={pathname.startsWith("/dashboard/admin") ? styles.highlightNav : undefined} href="/dashboard/admin"><SvgIcon name="shield" size={20}/>Admin</Link>}
        </nav>
    );
}
