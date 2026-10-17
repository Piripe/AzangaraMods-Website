import styles from "./page.module.css";
import NavBar from "../components/navBar";
import LinkButton from "@/components/kit/linkButton";
import SvgIcon from "@/components/kit/svgIcon";

export default function Home() {
  return (
    <div className={styles.container}>
      <NavBar/>
      <main className={styles.hero}>
        <span className={styles.badge}><SvgIcon name="map" size={18}/>Custom levels for Azangara</span>
        <h1 className={styles.title}>Build, share and play <span className={styles.accent}>new levels</span></h1>
        <p className={styles.subtitle}>The first website for sharing custom levels for Azangara. Upload your level, add some screenshots and publish it for everyone to play.</p>
        <div className={styles.actions}>
          <LinkButton variant="filled" icon="add" href="/dashboard/levels/new">Create a level</LinkButton>
          <LinkButton variant="outlined" href="/dashboard/levels">My levels</LinkButton>
        </div>
      </main>
    </div>
  );
}
