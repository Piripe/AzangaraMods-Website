"use client";
import Link from "next/link";
import styles from "./navbar.module.css";
import { usePathname } from "next/navigation";
import SvgIcon from "../kit/svgIcon";
import useUserData from "@/hooks/useUserData";

export function DefaultNav() {
    const pathname = usePathname();
    const {user} = useUserData();
    return (
        <nav className={styles.navBar}>
            <Link className={pathname === "/" ? styles.highlightNav : undefined} href="/"><SvgIcon name="home" size={20}/>Home</Link>
            <Link className={pathname.startsWith("/levels") ? styles.highlightNav : undefined} href="/levels"><SvgIcon name="search" size={20}/>Levels</Link>
            {user && <>
                <div className={styles.separator} role="separator" aria-orientation="vertical"/>
                <Link className={pathname.startsWith("/dashboard/levels") ? styles.highlightNav : undefined} href="/dashboard/levels"><SvgIcon name="map" size={20}/>My Levels</Link>
                {user.admin && <Link className={pathname.startsWith("/dashboard/admin") ? styles.highlightNav : undefined} href="/dashboard/admin"><SvgIcon name="shield" size={20}/>Admin</Link>}
            </>}
        </nav>
    );
}
