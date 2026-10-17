import { ReactNode } from "react";
import styles from "./card.module.css";

export default function Card({children, title, actions, className}:{children?:ReactNode, title?:ReactNode, actions?:ReactNode, className?:string}) {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      {(title || actions) &&
        <div className={styles.header}>
          {typeof title === "string" ? <h2>{title}</h2> : title}
          {actions}
        </div>
      }
      {children}
    </section>
  );
}
