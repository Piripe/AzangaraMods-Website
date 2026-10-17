import { useId, useState } from "react";
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
  type,
  autoComplete,
  autoFocus,
  maxLength,
  min,
  max,
  defaultValue,
  supportingText,
  error,
  icon,
  className
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, password?:boolean|undefined,newPassword?:boolean|undefined, usernameEntry?:boolean|undefined, type?:"text"|"email"|"number"|undefined, autoComplete?:string|undefined, autoFocus?:boolean|undefined, maxLength?:number|undefined, min?:number|undefined, max?:number|undefined, defaultValue?:string|undefined, supportingText?:string|undefined, error?:string|null|undefined, icon?:SvgIconName|undefined, className?:string|undefined}) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);
  const [revealed, setRevealed] = useState(false);
  const supportingId = useId();

  return (
    <label className={`${styles.wrapper} ${className ?? ""}`}>
      <span className={`${styles.field} ${styles.box} ${error ? styles.invalid : ""}`}>
        {icon && <span className={styles.leadingIcon}><SvgIcon name={icon} size={20}/></span>}
        <input
          className={styles.input}
          type={password && !revealed ? "password" : type ?? "text"}
          autoComplete={autoComplete ?? (newPassword ? "new-password" : undefined)}
          autoFocus={autoFocus}
          name={password ? "password" :  usernameEntry ? "username" : undefined}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || supportingText ? supportingId : undefined}
          onChange={(e)=>{setLength(e.target.value.length); onChange(e.target.value);}}
          maxLength={maxLength}
          min={min}
          max={max}
          defaultValue={defaultValue}/>
        {password &&
          <button type="button" className={styles.trailingButton} onClick={()=>setRevealed(!revealed)} aria-label={revealed ? "Hide password" : "Show password"} aria-pressed={revealed}>
            <SvgIcon name={revealed ? "visibilityOff" : "visibility"} size={20}/>
          </button>
        }
      </span>
      <SupportingText id={supportingId} text={error || supportingText} error={!!error} length={length} maxLength={maxLength}/>
    </label>
  );
}
