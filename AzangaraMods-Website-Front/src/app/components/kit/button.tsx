import { JSX } from "react";

export default function Button({children="", click=()=>{}, disabled=false}:{children:string|JSX.Element, click?:()=>void, disabled?:boolean}) {

  return (
    <button onClick={click} disabled={disabled}>
      {children}
    </button>
  );
}