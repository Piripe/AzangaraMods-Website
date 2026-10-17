import { ReactNode } from "react";
import Link from "next/link";
import { buttonClass, ButtonVariant } from "./button";
import SvgIcon, { SvgIconName } from "./svgIcon";

export default function LinkButton({children="", href, variant="tonal", icon}:{children:ReactNode, href:string, variant?:ButtonVariant, icon?:SvgIconName}) {

  return (
    <Link href={href} className={buttonClass(variant, icon !== undefined)}>
      {icon && <SvgIcon name={icon} size={18}/>}
      {children}
    </Link>
  );
}
