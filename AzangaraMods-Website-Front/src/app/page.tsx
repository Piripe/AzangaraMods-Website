import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "./components/navBar";

export default function Home() {
  return (
    <div className={styles.container}>
      <NavBar/>
      {"home"}
    </div>
  );
}
