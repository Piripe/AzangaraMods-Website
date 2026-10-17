import { ReactNode } from "react";
import styles from "./chip.module.css";
import SvgIcon, { SvgIconName } from "./svgIcon";

export default function Chip({children, icon, variant="outlined", small=false}:{children:ReactNode, icon?:SvgIconName, variant?:"outlined"|"highlight"|"success", small?:boolean}) {
  return (
    <span className={`${styles.chip} ${variant !== "outlined" ? styles[variant] : ""} ${small ? styles.small : ""}`}>
      {icon && <SvgIcon name={icon} size={small ? 14 : 18}/>}
      {children}
    </span>
  );
}
