import NavBar from "@/app/components/navBar";
import { DashboardNav } from "../components/dashboardNav";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
        <NavBar/>
        <DashboardNav/>
        {children}
    </div>
  );
}
