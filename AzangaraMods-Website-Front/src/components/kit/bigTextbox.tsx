import { useState } from "react";
import styles from "./field.module.css";
import { SupportingText } from "./fieldParts";

export default function BigTextBox(
  {
    onChange=()=>{}, 
  placeholder, 
  maxLength,
  defaultValue,
  className,
  label,
  supportingText,
  error
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, maxLength?:number|undefined, defaultValue?:string|undefined, className?:string|undefined, label?:string|undefined, supportingText?:string|undefined, error?:string|null|undefined}) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);

  return (
    <label className={`${styles.wrapper} ${styles.wide} ${className ?? ""}`}>
      {label && <span className={styles.boxLabel}>{label}</span>}
      <span className={`${styles.field} ${styles.box} ${error ? styles.invalid : ""}`}>
        <textarea className={styles.input} aria-invalid={error ? true : undefined} placeholder={placeholder} aria-label={label ? undefined : placeholder} onChange={(e)=>{setLength(e.target.value.length); onChange(e.target.value);}} maxLength={maxLength} defaultValue={defaultValue}/>
      </span>
      <SupportingText text={error || supportingText} error={!!error} length={length} maxLength={maxLength}/>
    </label>
  );
}
