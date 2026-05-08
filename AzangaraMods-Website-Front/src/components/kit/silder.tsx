import { JSX } from "react";

export default function Slider(
  {
    onChange=()=>{},
    min=0,
    max=100,
    defaultValue=0,
    step=1
  }:{
    onChange?:(e:number)=>void, min?:number|undefined, max?:number|undefined, defaultValue?:number|undefined, step?:number|undefined}) {

  return (
    <input type="range" min={min} max={max} step={step} defaultValue={defaultValue} onChange={(e)=>onChange(Number(e.target.value))}/>
  );
}