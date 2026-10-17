import NavBar from "@/components/navBar";
import styles from "../levels/layout.module.css";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.container}>
        <NavBar />
        {children}
    </div>
  );
}
