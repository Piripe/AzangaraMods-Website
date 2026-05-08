"use client";
import Link from "next/link";
import styles from "./navbar.module.css";
import { usePathname } from "next/navigation";

export function DefaultNav() {
    const pathname = usePathname();
    return (
        <div className={styles.navBar}>
            <Link className={pathname === "/" ? styles.highlightNav : undefined} href="/">Home</Link>
        </div>
    );
}