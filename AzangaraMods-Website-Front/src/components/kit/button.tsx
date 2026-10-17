import { JSX } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text";

export function buttonClass(variant: ButtonVariant) {
  return `${styles.button} ${styles[variant]}`;
}

export default function Button({children="", click=()=>{}, disabled=false, variant="tonal"}:{children:string|JSX.Element, click?:()=>void, disabled?:boolean, variant?:ButtonVariant}) {

  return (
    <button className={buttonClass(variant)} onClick={click} disabled={disabled}>
      {children}
    </button>
  );
}
