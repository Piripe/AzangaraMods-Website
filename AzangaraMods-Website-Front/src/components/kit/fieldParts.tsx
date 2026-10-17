import styles from "./field.module.css";

export function fieldClass(label?:string) {
  return label ? `${styles.field} ${styles.labelled}` : styles.field;
}

export function FieldLabel({label}:{label?:string}) {
  return (
    <>
      {label && <span className={styles.label}>{label}</span>}
      <fieldset className={styles.outline} aria-hidden="true">
        {label && <legend><span>{label}</span></legend>}
      </fieldset>
    </>
  );
}

export function SupportingText({id, text, error, length, maxLength}:{id?:string, text?:string, error?:boolean, length:number, maxLength?:number}) {
  if (!text && maxLength === undefined) return null;
  return (
    <span className={`${styles.supporting} ${error ? styles.supportingError : ""}`}>
      {text && <span id={id} role={error ? "alert" : undefined}>{text}</span>}
      {maxLength !== undefined && <span className={styles.counter}>{length} / {maxLength}</span>}
    </span>
  );
}
