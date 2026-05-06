import { JSX } from "react";
import styles from "./button.module.css";

export default function Button({children="", click=()=>{}, disabled=false}:{children:string|JSX.Element, click?:()=>void, disabled?:boolean}) {

  return (
    <button className={styles.button} onClick={click} disabled={disabled}>
      {children}
    </button>
  );
}