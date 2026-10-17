import { useState } from "react";
import styles from "./field.module.css";
import { fieldClass, FieldLabel, SupportingText } from "./fieldParts";

export default function TextBox(
  {
    onChange=()=>{}, 
  placeholder, 
  password, 
  newPassword,
  usernameEntry,
  maxLength,
  defaultValue,
  label,
  supportingText,
  className
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, password?:boolean|undefined,newPassword?:boolean|undefined, usernameEntry?:boolean|undefined, maxLength?:number|undefined, defaultValue?:string|undefined, label?:string|undefined, supportingText?:string|undefined, className?:string|undefined}) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);

  return (
    <label className={`${styles.wrapper} ${className ?? ""}`}>
      <span className={fieldClass(label)}>
        <input className={styles.input} type={password ? "password" : "text"} autoComplete={newPassword ? "new-password" : undefined} name={password ? "password" :  usernameEntry ? "username" : undefined} placeholder={label ? (placeholder ?? " ") : placeholder} onChange={(e)=>{setLength(e.target.value.length); onChange(e.target.value);}} maxLength={maxLength} defaultValue={defaultValue}/>
        <FieldLabel label={label}/>
      </span>
      <SupportingText text={supportingText} length={length} maxLength={maxLength}/>
    </label>
  );
}
