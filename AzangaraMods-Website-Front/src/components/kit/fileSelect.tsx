import { DragEvent, useId, useState } from "react";
import styles from "./fileSelect.module.css";
import formatBytes from "@/utils/fileSize";

export default function FileSelect({accept=".jpg, .png, .jpeg", onChange=(e)=>{}, disabled=false}:{accept?:string, onChange?:(e:File|null)=>void, disabled?:boolean}) {
  const id = useId();
  const [file, setFile] = useState<File|null>(null);
  const [dragging, setDragging] = useState(false);

  const select = (f:File|null) => {
    setFile(f);
    onChange(f);
  };

  const onDrop = (e:DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    select(e.dataTransfer.files?.[0] ?? null);
  };

  return (
    <label
      htmlFor={id}
      className={`${styles.dropZone} ${dragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""} ${file ? styles.selected : ""}`}
      onDragOver={(e)=>{e.preventDefault(); setDragging(true);}}
      onDragLeave={()=>setDragging(false)}
      onDrop={onDrop}
    >
      <input className={styles.input} type="file" id={id} accept={accept} onChange={(e)=>select(e.target.files?.[0] ?? null)} disabled={disabled} />
      <span className={styles.iconBox}>
        {file ?
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
        :
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
        }
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{file ? file.name : "Choose a file or drop it here"}</span>
        <span className={styles.hint}>{file ? formatBytes(file.size) : accept}</span>
      </span>
    </label>
  );
}
