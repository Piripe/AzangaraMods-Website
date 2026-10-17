import styles from "./progressBar.module.css";

// Linear progress indicator. Leave value undefined for an indeterminate bar.
export default function ProgressBar({value, label}:{value?:number, label?:string}) {
  const indeterminate = value === undefined;
  return (
    <div
      className={`${styles.track} ${indeterminate ? styles.indeterminate : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(value * 100)}
    >
      <span className={styles.bar} style={indeterminate ? undefined : { transform: `scaleX(${value})` }}/>
    </div>
  );
}
