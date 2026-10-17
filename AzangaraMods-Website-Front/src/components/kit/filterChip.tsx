import { ReactNode } from "react";
import styles from "./chip.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export default function FilterChip({children, selected, onToggle, icon, count, small=false}:{children:ReactNode, selected:boolean, onToggle:()=>void, icon?:SvgIconName, count?:number, small?:boolean}) {
  const shownIcon = selected ? "check" : icon;
  return (
    <button type="button" className={`${styles.chip} ${styles.filter} ${selected ? styles.selected : ""} ${small ? styles.small : ""}`} onClick={onToggle} aria-pressed={selected}>
      {shownIcon && <SvgIcon name={shownIcon} size={small ? 14 : 18}/>}
      {children}
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  );
}
