import { ReactNode, RefObject, useRef } from "react";
import { flushSync } from "react-dom";
import styles from "./tabs.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export type Tab<T extends string> = { id:T, label:string, icon?:SvgIconName, count?:number };

const duration = 350;
const exitDuration = 150;
const slide = 32;
const easing = "cubic-bezier(0.05, 0.7, 0.1, 1)"; // --ease-emphasized-decelerate

// The open TabPanel. Only one Tabs/TabPanel pair is expected per page
let currentPanel: HTMLElement | null = null;

// Renders the new tab synchronously, then animates from the old state: a copy of the old panel fades out
// sliding away while the new one slides in, the panel's height eases between both, and the underline glides over
function switchTab(update: ()=>void, direction: 1 | -1, indicator: RefObject<HTMLElement | null>) {
  const oldPanel = currentPanel;
  if (!oldPanel || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }

  const panelRect = oldPanel.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  const indicatorRect = indicator.current?.getBoundingClientRect();

  const ghost = oldPanel.cloneNode(true) as HTMLElement;
  ghost.inert = true;
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("role");
  Object.assign(ghost.style, {
    position: "absolute",
    top: `${panelRect.top - bodyRect.top}px`,
    left: `${panelRect.left - bodyRect.left}px`,
    width: `${panelRect.width}px`,
    margin: "0",
    pointerEvents: "none",
  });

  flushSync(update);

  document.body.append(ghost);
  ghost.animate([
    { opacity: 1, transform: "none" },
    { opacity: 0, transform: `translateX(${-direction * slide}px)` },
  ], { duration: exitDuration, easing: "ease-in", fill: "forwards" }).finished.finally(()=>ghost.remove());

  const newPanel = currentPanel;
  if (newPanel && newPanel !== oldPanel) {
    newPanel.animate([
      { opacity: 0, transform: `translateX(${direction * slide}px)` },
      { opacity: 1, transform: "none" },
    ], { duration, easing });
    const height = newPanel.getBoundingClientRect().height;
    if (Math.abs(height - panelRect.height) > 1) {
      newPanel.animate([
        { height: `${panelRect.height}px`, overflow: "clip" },
        { height: `${height}px`, overflow: "clip" },
      ], { duration, easing });
    }
  }

  // The underline is rendered in the new tab; slide and stretch it from where the old one was
  const newIndicator = indicator.current;
  if (indicatorRect && newIndicator) {
    const rect = newIndicator.getBoundingClientRect();
    newIndicator.animate([
      { transform: `translateX(${indicatorRect.left - rect.left}px) scaleX(${indicatorRect.width / rect.width})` },
      { transform: "none" },
    ], { duration, easing });
  }
}

export default function Tabs<T extends string>({tabs, value, onChange}:{tabs:Tab<T>[], value:T, onChange:(id:T)=>void}) {
  const indicator = useRef<HTMLSpanElement>(null);
  const index = tabs.findIndex(t=>t.id === value);

  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t, i)=>(
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} className={`${styles.tab} ${t.id === value ? styles.active : ""}`}
          onClick={()=>t.id !== value && switchTab(()=>onChange(t.id), i > index ? 1 : -1, indicator)}>
          {t.icon && <SvgIcon name={t.icon} size={18}/>}
          {t.label}
          {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
          {t.id === value && <span ref={indicator} className={styles.indicator}/>}
        </button>
      ))}
    </div>
  );
}

// Wraps the content of the open tab, remounted when `value` changes
export function TabPanel({value, className, children}:{value:string, className?:string, children:ReactNode}) {
  return (
    <div key={value} role="tabpanel" className={`${styles.panel} ${className ?? ""}`} ref={el=>{
      if (el) currentPanel = el;
      else if (currentPanel && !currentPanel.isConnected) currentPanel = null;
    }}>
      {children}
    </div>
  );
}
