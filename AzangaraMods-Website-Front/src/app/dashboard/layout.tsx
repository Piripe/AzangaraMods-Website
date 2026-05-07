import NavBar, { NavBarType } from "@/app/components/navBar";
import { DashboardNav } from "../components/nav/dashboardNav";
import styles from "./layout.module.css";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.container}>
        <NavBar navBarType={NavBarType.DASHBOARD} />
        {children}
    </div>
  );
}
