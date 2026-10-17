"use client";
import Link from "next/link";
import styles from "./navbar.module.css";
import { usePathname } from "next/navigation";
import SvgIcon from "../kit/svgIcon";

export function DefaultNav() {
    const pathname = usePathname();
    return (
        <nav className={styles.navBar}>
            <Link className={pathname === "/" ? styles.highlightNav : undefined} href="/"><SvgIcon name="home" size={20}/>Home</Link>
            <Link className={pathname.startsWith("/levels") ? styles.highlightNav : undefined} href="/levels"><SvgIcon name="search" size={20}/>Levels</Link>
        </nav>
    );
}
