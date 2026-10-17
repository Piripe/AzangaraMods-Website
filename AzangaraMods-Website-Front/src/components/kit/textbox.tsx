import { useState } from "react";
import styles from "./field.module.css";
import { SupportingText } from "./fieldParts";
import SvgIcon, { SvgIconName } from "./svgIcon";

export default function TextBox(
  {
    onChange=()=>{}, 
  placeholder, 
  password, 
  newPassword,
  usernameEntry,
  maxLength,
  defaultValue,
  supportingText,
  icon,
  className
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, password?:boolean|undefined,newPassword?:boolean|undefined, usernameEntry?:boolean|undefined, maxLength?:number|undefined, defaultValue?:string|undefined, supportingText?:string|undefined, icon?:SvgIconName|undefined, className?:string|undefined}) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);

  return (
    <label className={`${styles.wrapper} ${className ?? ""}`}>
      <span className={`${styles.field} ${styles.box}`}>
        {icon && <span className={styles.leadingIcon}><SvgIcon name={icon} size={20}/></span>}
        <input className={styles.input} type={password ? "password" : "text"} autoComplete={newPassword ? "new-password" : undefined} name={password ? "password" :  usernameEntry ? "username" : undefined} placeholder={placeholder} aria-label={placeholder} onChange={(e)=>{setLength(e.target.value.length); onChange(e.target.value);}} maxLength={maxLength} defaultValue={defaultValue}/>
      </span>
      <SupportingText text={supportingText} length={length} maxLength={maxLength}/>
    </label>
  );
}
