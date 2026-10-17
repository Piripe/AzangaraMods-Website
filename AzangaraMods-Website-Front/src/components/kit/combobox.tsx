import styles from "./field.module.css";
import { fieldClass, FieldLabel, SupportingText } from "./fieldParts";

export default function ComboBox(
  {
    onChange=()=>{}, 
  values,
  defaultValue,
  label,
  supportingText
}:{
  onChange?:(e:number)=>void, values:string[], defaultValue?:number|undefined, label?:string|undefined, supportingText?:string|undefined}) {

  return (
    <label className={styles.wrapper}>
      <span className={fieldClass(label)}>
        <select className={styles.input} onChange={(e)=>onChange(parseInt(e.target.value))} defaultValue={defaultValue}>
          {values.map((v, i) => (
            <option key={i} value={i}>
              {v}
            </option>
          ))}
        </select>
        <FieldLabel label={label}/>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>
      </span>
      <SupportingText text={supportingText} length={0}/>
    </label>
  );
}
