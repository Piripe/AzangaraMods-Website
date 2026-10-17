import { JSX } from "react";
import Link from "next/link";
import { buttonClass, ButtonVariant } from "./button";

export default function LinkButton({children="", href, variant="tonal"}:{children:string|JSX.Element, href:string, variant?:ButtonVariant}) {

  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}
