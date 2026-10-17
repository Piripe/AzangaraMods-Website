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
  supportingText
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, maxLength?:number|undefined, defaultValue?:string|undefined, className?:string|undefined, supportingText?:string|undefined}) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);

  return (
    <label className={`${styles.wrapper} ${styles.wide} ${className ?? ""}`}>
      <span className={`${styles.field} ${styles.box}`}>
        <textarea className={styles.input} placeholder={placeholder} aria-label={placeholder} onChange={(e)=>{setLength(e.target.value.length); onChange(e.target.value);}} maxLength={maxLength} defaultValue={defaultValue}/>
      </span>
      <SupportingText text={supportingText} length={length} maxLength={maxLength}/>
    </label>
  );
}
