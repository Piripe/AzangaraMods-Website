import { KeyboardEvent, useRef, useState } from "react";
import styles from "./field.module.css";
import { fieldClass, FieldLabel, SupportingText } from "./fieldParts";
import Chip from "./chip";

// Tags can't contain spaces (the API splits on them), so whitespace and commas both separate tags
const separator = /[\s,]+/;

export default function TagsInput(
  {
    onChange=()=>{},
  defaultValue,
  maxTags=10,
  maxTagLength=32,
  label,
  placeholder="Add a tag…",
  supportingText
}:{
  onChange?:(e:string[])=>void, defaultValue?:string[]|undefined, maxTags?:number, maxTagLength?:number, label?:string|undefined, placeholder?:string, supportingText?:string|undefined}) {
  const [tags, setTags] = useState(defaultValue?.filter(t=>t.length > 0) ?? []);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const full = tags.length >= maxTags;

  function update(next:string[]) {
    setTags(next);
    onChange(next);
  }

  // Commits every complete tag in `text`; the last segment is kept as the draft unless `commitAll`
  function commit(text:string, commitAll:boolean) {
    const parts = text.split(separator);
    const rest = commitAll ? "" : parts.pop()!;
    const next = [...tags];
    for (const part of parts) {
      const tag = part.slice(0, maxTagLength);
      if (tag.length === 0 || next.length >= maxTags) continue;
      if (next.some(t=>t.toLowerCase() === tag.toLowerCase())) continue;
      next.push(tag);
    }
    if (next.length !== tags.length) update(next);
    setDraft(next.length >= maxTags ? "" : rest.slice(0, maxTagLength));
  }

  function onKeyDown(e:KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft, true);
    } else if (e.key === "Backspace" && draft.length === 0 && tags.length > 0) {
      e.preventDefault();
      update(tags.slice(0, -1));
    }
  }

  return (
    <div className={`${styles.wrapper} ${styles.wide}`}>
      <div className={`${fieldClass(label)} ${tags.length > 0 ? styles.filled : ""}`} onClick={()=>inputRef.current?.focus()}>
        <div className={styles.tags}>
          {tags.map((t, i)=>(
            <Chip key={t} icon="tag" onRemove={()=>{update(tags.filter((_, j)=>j !== i)); inputRef.current?.focus();}}>{t}</Chip>
          ))}
          <input
            ref={inputRef}
            className={styles.tagsEntry}
            aria-label={label}
            value={draft}
            readOnly={full}
            placeholder={full ? `Limit of ${maxTags} reached` : placeholder}
            onChange={(e)=>commit(e.target.value, false)}
            onKeyDown={onKeyDown}
            onBlur={()=>commit(draft, true)}
          />
        </div>
        <FieldLabel label={label}/>
      </div>
      <SupportingText text={supportingText} length={tags.length} maxLength={maxTags}/>
    </div>
  );
}
