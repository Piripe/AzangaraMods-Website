import { useClickOutside } from "@/utils/clickOutside";
import { JSX, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./popup.module.css";

export default function Popup({children, title, closeCallback = ()=>{}}:{children:JSX.Element, title?:string|undefined, closeCallback?:()=>void}) {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, closeCallback ?? (()=>{}));

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeCallback();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [closeCallback]);
    
    return createPortal(
        <>
            <div className={styles.scrim}/>
            <div ref={ref} className={styles.popup} role="dialog" aria-modal="true" aria-label={title}>
                {title && <h2 className={styles.title}>{title}</h2>}
                <div className={styles.content}>{children}</div>
            </div>
        </>
        , document.body);
}
