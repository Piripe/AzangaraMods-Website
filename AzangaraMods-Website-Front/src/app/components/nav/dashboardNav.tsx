import Link from "next/link";
import styles from "./navbar.module.css";

export function DashboardNav() {
    return (
        <div className={styles.navBar}>
            <Link href="/">Home</Link>
            {/* <Link href="/dashboard">Dashboard</Link> */}
            <Link href="/dashboard/levels">My Levels</Link>
        </div>
    );
}