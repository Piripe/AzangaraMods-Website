import { CSSProperties, useState } from "react";
import styles from "./slider.module.css";

export default function Slider(
  {
    onChange=()=>{},
    min=0,
    max=100,
    defaultValue=0,
    step=1
  }:{
    onChange?:(e:number)=>void, min?:number|undefined, max?:number|undefined, defaultValue?:number|undefined, step?:number|undefined}) {
  const [value, setValue] = useState(defaultValue);
  const fill = max > min ? (value - min) / (max - min) * 100 : 0;

  return (
    <input className={styles.slider} style={{ "--fill": `${fill}%` } as CSSProperties} type="range" min={min} max={max} step={step} defaultValue={defaultValue} onChange={(e)=>{setValue(Number(e.target.value)); onChange(Number(e.target.value));}}/>
  );
}
