import { useEffect, useRef, useState } from "react";
import styles from "./menu.module.css";
import tooltip from "./tooltip.module.css";
import { iconButtonClass } from "./iconButton";
import SvgIcon, { SvgIconName } from "./svgIcon";
import { useClickOutside } from "@/utils/clickOutside";

export type MenuItem =
  | { label:string, icon?:SvgIconName, href:string, download?:boolean, disabled?:boolean }
  | { label:string, icon?:SvgIconName, click:()=>void, disabled?:boolean }
  | "divider";

// Icon button that opens a dropdown of actions anchored below it
export default function Menu({items, icon="moreVert", label="More actions"}:{items:MenuItem[], icon?:SvgIconName, label?:string}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, ()=>setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div ref={ref} className={styles.anchor}>
      <button type="button" className={iconButtonClass("standard")} onClick={()=>setOpen(!open)} aria-label={label} aria-haspopup="menu" aria-expanded={open}>
        <SvgIcon name={icon}/>
        {!open && <span className={tooltip.tooltip}>{label}</span>}
      </button>
      {open &&
        <div className={styles.menu} role="menu">
          {items.map((item, i)=>{
            if (item === "divider") return <div key={i} className={styles.divider}/>;
            const content = <>{item.icon && <SvgIcon name={item.icon} size={20}/>}{item.label}</>;
            if ("href" in item) return (
              <a key={i} role="menuitem" className={styles.item} href={item.href} download={item.download} aria-disabled={item.disabled} onClick={()=>setOpen(false)}>{content}</a>
            );
            return (
              <button key={i} type="button" role="menuitem" className={styles.item} disabled={item.disabled} onClick={()=>{ setOpen(false); item.click(); }}>{content}</button>
            );
          })}
        </div>
      }
    </div>
  );
}
