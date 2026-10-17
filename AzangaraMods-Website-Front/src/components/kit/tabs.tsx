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
