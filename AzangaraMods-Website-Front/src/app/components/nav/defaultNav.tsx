import Link from "next/link";
import styles from "./navbar.module.css";

export function DefaultNav() {
    return (
        <div className={styles.navBar}>
            <Link href="/">Home</Link>
        </div>
    );
}