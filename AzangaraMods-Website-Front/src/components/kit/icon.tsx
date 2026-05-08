
import { JSX } from "react";
import styles from "./icon.module.css";

export enum IconType {
  LockOpen = "/assets/icons/lock-open.svg",
  LockClosed = "/assets/icons/lock-closed.svg",
}

export default function Icon({icon, alt, size=24}:{icon:IconType, alt?:string|undefined, size?:number}) {

  return (
    <div className={styles.icon}>
        <img src={icon} alt={alt} style={{ width: size, height: size }}/>
        <div className={styles.infoBubble}>{alt}</div>
    </div>
  );
}