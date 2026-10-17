import { ReactNode, useState } from "react";
import styles from "./tabs.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export type Tab<T extends string> = { id:T, label:string, icon?:SvgIconName, count?:number };

export default function Tabs<T extends string>({tabs, value, onChange}:{tabs:Tab<T>[], value:T, onChange:(id:T)=>void}) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map(t=>(
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} className={`${styles.tab} ${t.id === value ? styles.active : ""}`} onClick={()=>onChange(t.id)}>
          {t.icon && <SvgIcon name={t.icon} size={18}/>}
          {t.label}
          {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Wraps the content of the open tab: it is remounted when `value` changes, so it slides in from the side of the new tab
export function TabPanel<T extends string>({tabs, value, className, children}:{tabs:Tab<T>[], value:T, className?:string, children:ReactNode}) {
  const index = tabs.findIndex(t=>t.id === value);
  const [previous, setPrevious] = useState(index);
  const [direction, setDirection] = useState<"left"|"right"|null>(null);
  if (index !== previous) {
    setPrevious(index);
    setDirection(index > previous ? "right" : "left");
  }

  return (
    <div key={value} role="tabpanel" className={`${styles.panel} ${direction ? styles[direction] : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
