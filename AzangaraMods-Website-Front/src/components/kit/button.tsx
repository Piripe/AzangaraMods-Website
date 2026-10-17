import { ReactNode } from "react";
import styles from "./button.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text";

export function buttonClass(variant: ButtonVariant, hasIcon = false) {
  return `${styles.button} ${styles[variant]} ${hasIcon ? styles.withIcon : ""}`;
}

export default function Button({children="", click=()=>{}, disabled=false, variant="tonal", icon}:{children:ReactNode, click?:()=>void, disabled?:boolean, variant?:ButtonVariant, icon?:SvgIconName}) {

  return (
    <button className={buttonClass(variant, icon !== undefined)} onClick={click} disabled={disabled}>
      {icon && <SvgIcon name={icon} size={18}/>}
      {children}
    </button>
  );
}
