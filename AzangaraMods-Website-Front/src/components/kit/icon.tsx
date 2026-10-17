
import { JSX } from "react";
import styles from "./icon.module.css";
import tooltip from "./tooltip.module.css";

export enum IconType {
  LockOpen = "/assets/icons/lock-open.svg",
  LockClosed = "/assets/icons/lock-closed.svg",
}

export default function Icon({icon, alt, size=24}:{icon:IconType, alt?:string|undefined, size?:number}) {

  return (
    <div className={`${styles.icon} ${tooltip.anchor}`}>
        <img src={icon} alt={alt} style={{ width: size, height: size }}/>
        {alt && <div className={tooltip.tooltip}>{alt}</div>}
    </div>
  );
}
