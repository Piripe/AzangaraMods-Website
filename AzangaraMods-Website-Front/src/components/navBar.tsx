import Link from "next/link";
import UserButton from "./userButton";
import styles from "./navBar.module.css";
import { DashboardNav } from "./nav/dashboardNav";
import { DefaultNav } from "./nav/defaultNav";

export enum NavBarType {
    DEFAULT = "default",
    DASHBOARD = "dashboard",
}

export default function NavBar({navBarType}:{navBarType?:NavBarType|undefined}) {
  return (
    <header className={styles.navBar}>
        <Link href="/" className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt=""/>
            <span className={styles.brandText}>Azangara <span className={styles.accent}>Mods</span></span>
        </Link>
        {(() => {
            switch (navBarType) {
                case NavBarType.DASHBOARD:
                    return <DashboardNav />;
                default:
                    return <DefaultNav />;
            }
        })()}
        <div className={styles.spacer}/>
        <UserButton/>
    </header>
  );
}
