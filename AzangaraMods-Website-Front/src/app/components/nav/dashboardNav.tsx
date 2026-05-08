"use client";
import Link from "next/link";
import styles from "./navbar.module.css";
import { usePathname } from "next/navigation";

export function DashboardNav() {
    const pathname = usePathname();
    return (
        <div className={styles.navBar}>
            <Link href="/">Home</Link>
            {/* <Link className={pathname === "/dashboard" ? styles.highlightNav : undefined} href="/dashboard">Dashboard</Link> */}
            <Link className={pathname === "/dashboard/levels" ? styles.highlightNav : undefined} href="/dashboard/levels">My Levels</Link>
        </div>
    );
}