import NavBar, { NavBarType } from "@/app/components/navBar";
import { DashboardNav } from "../components/nav/dashboardNav";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
        <NavBar navBarType={NavBarType.DASHBOARD} />
        {children}
    </div>
  );
}
