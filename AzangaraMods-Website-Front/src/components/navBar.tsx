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
    <div className={styles.navBar}>
        {(() => {
            switch (navBarType) {
                case NavBarType.DASHBOARD:
                    return <DashboardNav />;
                default:
                    return <DefaultNav />;
            }
        })()}

        <UserButton/>
    </div>
  );
}