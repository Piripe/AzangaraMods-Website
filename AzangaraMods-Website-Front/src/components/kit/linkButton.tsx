import { JSX } from "react";
import styles from "./button.module.css";
import Link from "next/link";

export default function LinkButton({children="", href}:{children:string|JSX.Element, href:string}) {

  return (
    <Link href={href} className={styles.button}>
      {children}
    </Link>
  );
}