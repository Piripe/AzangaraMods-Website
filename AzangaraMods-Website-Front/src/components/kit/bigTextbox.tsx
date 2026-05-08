import { JSX } from "react";

export default function BigTextBox(
  {
    onChange=()=>{}, 
  placeholder, 
  maxLength,
  defaultValue,
  className
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, maxLength?:number|undefined, defaultValue?:string|undefined, className?:string|undefined}) {

  return (
    <textarea placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} maxLength={maxLength} defaultValue={defaultValue} className={className}/>
  );
}