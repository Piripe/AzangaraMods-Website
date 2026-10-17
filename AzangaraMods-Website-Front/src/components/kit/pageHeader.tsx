import { ReactNode } from "react";
import styles from "./pageHeader.module.css";
import { LinkIconButton } from "./iconButton";

export default function PageHeader({title, subtitle, backHref, badge, actions}:{title:ReactNode, subtitle?:ReactNode, backHref?:string, badge?:ReactNode, actions?:ReactNode}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.title}>
        {backHref && <LinkIconButton icon="arrowBack" label="Back" href={backHref}/>}
        <div>
          <h1>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {badge}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
