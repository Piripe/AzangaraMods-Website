import { useClickOutside } from "@/app/utils/clickOutside";
import { JSX, useRef } from "react";
import { createPortal } from "react-dom";

export default function Popup({children, title, closeCallback = ()=>{}}:{children:JSX.Element, title?:string|undefined, closeCallback?:()=>void}) {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, closeCallback ?? (()=>{}));
    
    return createPortal(
        <div ref={ref}>
            <div>{title}</div>
            <div>{children}</div>
        </div>
        , document.body);
}