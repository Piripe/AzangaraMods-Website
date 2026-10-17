import { ReactNode, useId } from "react";
import styles from "./radioList.module.css";

export type RadioOption = { value: string, label: ReactNode, description?: ReactNode };

export default function RadioList({options, value, onChange=()=>{}, disabled=false, label}:{options:RadioOption[], value:string|null, onChange?:(value:string)=>void, disabled?:boolean, label?:string}) {
  const name = useId();
  return (
    <div className={styles.list} role="radiogroup" aria-label={label}>
      {options.map(o=>(
        <label key={o.value} className={`${styles.option} ${o.value === value ? styles.checked : ""} ${disabled ? styles.disabled : ""}`}>
          <input className={styles.input} type="radio" name={name} value={o.value} checked={o.value === value} disabled={disabled} onChange={()=>onChange(o.value)}/>
          <span className={styles.radio} aria-hidden="true"/>
          <span className={styles.text}>
            <span className={styles.label}>{o.label}</span>
            {o.description && <span className={styles.description}>{o.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
