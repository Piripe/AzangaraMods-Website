import { ReactNode } from "react";
import styles from "./chip.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export default function Chip({children, icon, variant="outlined", small=false, onRemove}:{children:ReactNode, icon?:SvgIconName, variant?:"outlined"|"highlight"|"success", small?:boolean, onRemove?:()=>void}) {
  return (
    <span className={`${styles.chip} ${variant !== "outlined" ? styles[variant] : ""} ${small ? styles.small : ""} ${onRemove ? styles.removable : ""}`}>
      {icon && <SvgIcon name={icon} size={small ? 14 : 18}/>}
      {children}
      {onRemove && (
        <button type="button" className={styles.remove} onClick={(e)=>{e.stopPropagation(); onRemove();}} aria-label={`Remove ${typeof children === "string" ? children : ""}`.trim()}>
          <SvgIcon name="close" size={small ? 14 : 18}/>
        </button>
      )}
    </span>
  );
}
