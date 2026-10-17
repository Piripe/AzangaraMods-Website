import Link from "next/link";
import UserButton from "./userButton";
import styles from "./navBar.module.css";
import { DefaultNav } from "./nav/defaultNav";

export default function NavBar() {
  return (
    <header className={styles.navBar}>
        <Link href="/" className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt=""/>
            <span className={styles.brandText}>Azangara <span className={styles.accent}>Mods</span></span>
        </Link>
        <DefaultNav />
        <div className={styles.spacer}/>
        <UserButton/>
    </header>
  );
}
