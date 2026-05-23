import { JSX } from "react";

export default function ComboBox(
  {
    onChange=()=>{}, 
  values,
  defaultValue
}:{
  onChange?:(e:number)=>void, values:string[], defaultValue?:number|undefined}) {

  return (
    <select onChange={(e)=>onChange(parseInt(e.target.value))} defaultValue={defaultValue}>
      {values.map((v, i) => (
        <option key={i} value={i}>
          {v}
        </option>
      ))}
    </select>
  );
}