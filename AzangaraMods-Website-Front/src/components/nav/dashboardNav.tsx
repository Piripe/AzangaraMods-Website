"use client";
import Link from "next/link";
import styles from "./navbar.module.css";
import { usePathname } from "next/navigation";
import SvgIcon from "../kit/svgIcon";

export function DashboardNav() {
    const pathname = usePathname();
    return (
        <nav className={styles.navBar}>
            <Link href="/"><SvgIcon name="home" size={20}/>Home</Link>
            {/* <Link className={pathname === "/dashboard" ? styles.highlightNav : undefined} href="/dashboard">Dashboard</Link> */}
            <Link className={pathname.startsWith("/dashboard/levels") ? styles.highlightNav : undefined} href="/dashboard/levels"><SvgIcon name="map" size={20}/>My Levels</Link>
        </nav>
    );
}
