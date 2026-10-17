import Link from "next/link";
import styles from "./iconButton.module.css";
import tooltip from "./tooltip.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

type IconButtonVariant = "standard" | "tonal" | "danger";

function iconButtonClass(variant: IconButtonVariant) {
  return `${styles.iconButton} ${tooltip.anchor} ${variant !== "standard" ? styles[variant] : ""}`;
}

export default function IconButton({icon, label, click=()=>{}, disabled=false, variant="standard"}:{icon:SvgIconName, label:string, click?:()=>void, disabled?:boolean, variant?:IconButtonVariant}) {
  return (
    <button className={iconButtonClass(variant)} onClick={click} disabled={disabled} aria-label={label}>
      <SvgIcon name={icon}/>
      <span className={tooltip.tooltip}>{label}</span>
    </button>
  );
}

export function LinkIconButton({icon, label, href, variant="standard"}:{icon:SvgIconName, label:string, href:string, variant?:IconButtonVariant}) {
  return (
    <Link className={iconButtonClass(variant)} href={href} aria-label={label}>
      <SvgIcon name={icon}/>
      <span className={tooltip.tooltip}>{label}</span>
    </Link>
  );
}
