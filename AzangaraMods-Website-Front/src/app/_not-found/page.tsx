import styles from "../page.module.css";
import NavBar from "@/components/navBar";
import LinkButton from "@/components/kit/linkButton";

export default function Home() {
  return (
    <div className={styles.container}>
      <NavBar/>
      <main className={styles.hero}>
        <p className={styles.code}>404</p>
        <p className={styles.subtitle}>This page doesn&apos;t exist or has been moved.</p>
        <div className={styles.actions}>
          <LinkButton variant="filled" icon="home" href="/">Back home</LinkButton>
        </div>
      </main>
    </div>
  );
}
