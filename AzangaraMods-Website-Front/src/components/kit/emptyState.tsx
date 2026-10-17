import { ReactNode } from "react";
import styles from "./emptyState.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export default function EmptyState({icon, title, text, action}:{icon:SvgIconName, title:string, text?:string, action?:ReactNode}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.icon}><SvgIcon name={icon} size={28}/></span>
      <p className={styles.title}>{title}</p>
      {text && <p className={styles.text}>{text}</p>}
      {action}
    </div>
  );
}
