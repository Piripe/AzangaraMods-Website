import { ReactNode } from "react";
import styles from "./button.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "danger";

export function buttonClass(variant: ButtonVariant, hasIcon = false) {
  return `${styles.button} ${styles[variant]} ${hasIcon ? styles.withIcon : ""}`;
}

export default function Button({children="", click=()=>{}, disabled=false, variant="tonal", icon, type="button", className}:{children:ReactNode, click?:()=>void, disabled?:boolean, variant?:ButtonVariant, icon?:SvgIconName, type?:"button"|"submit", className?:string}) {

  return (
    <button type={type} className={`${buttonClass(variant, icon !== undefined)} ${className ?? ""}`} onClick={click} disabled={disabled}>
      {icon && <SvgIcon name={icon} size={18}/>}
      {children}
    </button>
  );
}
