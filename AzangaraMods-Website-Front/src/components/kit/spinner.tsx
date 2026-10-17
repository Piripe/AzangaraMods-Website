import styles from "./spinner.module.css";

export default function Spinner() {
  return (
    <div className={styles.wrapper} role="progressbar" aria-label="Loading">
      <svg className={styles.spinner} viewBox="25 25 50 50"><circle cx="50" cy="50" r="20"/></svg>
    </div>
  );
}
