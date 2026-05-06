import { JSX } from "react";

export default function FileSelect({accept=".jpg, .png, .jpeg", onChange=(e)=>{}, disabled=false}:{accept?:string, onChange?:(e:File|null)=>void, disabled?:boolean}) {

  return (
    <input type="file" id="file" accept={accept} onChange={(e)=>onChange(e.target.files?.[0] ?? null)} disabled={disabled} />
  );
}