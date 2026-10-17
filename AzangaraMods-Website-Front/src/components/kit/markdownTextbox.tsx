'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import fieldStyles from "./field.module.css";
import styles from "./markdownTextbox.module.css";
import { SupportingText } from "./fieldParts";
import { blockFlags, highlightMarkdown, MarkdownFlags as F } from "@/utils/markdown";

type Snapshot = { text: string, anchor: number, focus: number };
type EditKind = "insert" | "delete" | "other";

const inlineClasses: [number, string][] = [
  [F.syntax, styles.syntax],
  [F.bold, styles.bold],
  [F.italic, styles.italic],
  [F.spoiler, styles.spoiler],
  [F.code, styles.code],
  [F.link, styles.link],
  [F.mention, styles.mention],
];
const blockClasses: [number, string][] = [
  [F.codeBlock, styles.codeBlock],
  [F.heading1, styles.heading1],
  [F.heading2, styles.heading2],
  [F.heading3, styles.heading3],
  [F.subtext, styles.subtext],
];

const normalize = (text: string) => text.replace(/\r\n?/g, "\n");

/**
 * Text box for Discord Markdown that styles the text as it is typed. Every character stays visible: syntax is grayed
 * out, spoilers get a dark background and headings are bigger.
 *
 * The browser never edits the content itself: input events are applied to the text, which is then highlighted again.
 * Only IME composition cannot be cancelled, so the text is read back from the page once it ends.
 */
export default function MarkdownTextBox(
  {
    onChange=()=>{},
  placeholder,
  maxLength,
  defaultValue,
  className,
  label,
  supportingText,
  error
}:{
  onChange?:(e:string)=>void, placeholder?:string|undefined, maxLength?:number|undefined, defaultValue?:string|undefined, className?:string|undefined, label?:string|undefined, supportingText?:string|undefined, error?:string|null|undefined}) {
  const [length, setLength] = useState(()=>normalize(defaultValue ?? "").length);
  const editorRef = useRef<HTMLDivElement>(null);
  const text = useRef(normalize(defaultValue ?? ""));
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lastEdit = useRef<{ kind: EditKind, time: number } | null>(null);
  const composing = useRef(false);
  const dragged = useRef<readonly [number, number] | null>(null);
  const onChangeRef = useRef(onChange);
  const labelId = useId();
  const supportingId = useId();

  useLayoutEffect(() => { onChangeRef.current = onChange; });

  useLayoutEffect(() => {
    const editor = editorRef.current!;
    const value = () => text.current;

    const lineOf = (node: Node) => {
      while (node.parentNode !== editor) {
        if (!node.parentNode) return null;
        node = node.parentNode;
      }
      return node;
    };

    const toOffset = (node: Node, offset: number) => {
      const lines = editor.childNodes;
      let line: Node | null;
      let inLine = 0;
      if (node === editor) {
        if (offset >= lines.length) return value().length;
        line = lines[offset];
      } else {
        line = lineOf(node);
        if (!line) return null;
        const range = document.createRange();
        range.setStart(line, 0);
        range.setEnd(node, offset);
        inLine = range.toString().length;
      }
      let start = 0;
      for (let previous = line.previousSibling; previous; previous = previous.previousSibling) start += (previous.textContent?.length ?? 0) + 1;
      return start + inLine;
    };

    const toPoint = (offset: number): [Node, number] => {
      for (const line of editor.childNodes) {
        const lineLength = line.textContent?.length ?? 0;
        if (offset <= lineLength) {
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const nodeLength = (node as Text).length;
            if (offset <= nodeLength) return [node, offset];
            offset -= nodeLength;
          }
          return [line, 0];
        }
        offset -= lineLength + 1;
      }
      return [editor, editor.childNodes.length];
    };

    const getSelection = (): Snapshot | null => {
      const selection = document.getSelection();
      if (!selection?.anchorNode || !selection.focusNode || !editor.contains(selection.anchorNode)) return null;
      const anchor = toOffset(selection.anchorNode, selection.anchorOffset);
      const focus = toOffset(selection.focusNode, selection.focusOffset);
      return anchor === null || focus === null ? null : { text: value(), anchor, focus };
    };

    const setSelection = (anchor: number, focus: number) => {
      const selection = document.getSelection();
      if (!selection) return;
      selection.setBaseAndExtent(...toPoint(anchor), ...toPoint(focus));
      scrollToCaret(selection);
    };

    // The browser only scrolls to the caret for edits it makes itself.
    const scrollToCaret = (selection: Selection) => {
      if (!selection.focusNode) return;
      const range = document.createRange();
      range.setStart(selection.focusNode, selection.focusOffset);
      let rect = range.getBoundingClientRect();
      if (rect.height === 0) rect = (selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode.parentElement)!.getBoundingClientRect();
      const box = editor.getBoundingClientRect();
      if (rect.bottom > box.bottom) editor.scrollTop += rect.bottom - box.bottom;
      else if (rect.top < box.top) editor.scrollTop -= box.top - rect.top;
      if (rect.bottom > window.innerHeight) window.scrollBy(0, rect.bottom - window.innerHeight + 16);
      else if (rect.top < 0) window.scrollBy(0, rect.top - 16);
    };

    const render = () => {
      const source = value();
      const flags = highlightMarkdown(source);
      const lines: HTMLDivElement[] = [];
      let start = 0;
      for (const line of source.split("\n")) {
        const end = start + line.length;
        const div = document.createElement("div");
        let block = 0;
        // The line break ending a line belongs to it: headings and quotes include theirs.
        for (let i = start; i < Math.min(end + 1, source.length); i++) block |= flags[i] & blockFlags;
        div.className = [styles.line, block & F.quote ? styles.quote : "", blockClasses.find(([flag]) => block & flag)?.[1] ?? ""].filter(Boolean).join(" ");
        for (let i = start; i < end;) {
          const inline = flags[i] & ~blockFlags;
          let j = i + 1;
          while (j < end && (flags[j] & ~blockFlags) === inline) j++;
          const chunk = source.slice(i, j);
          if (inline === 0) div.append(chunk);
          else {
            const span = document.createElement("span");
            const decoration = (inline & F.underline ? 1 : 0) | (inline & F.strikethrough ? 2 : 0);
            span.className = [...inlineClasses.filter(([flag]) => inline & flag).map(([, name]) => name), ["", styles.underline, styles.strikethrough, styles.underlineStrikethrough][decoration]].filter(Boolean).join(" ");
            span.textContent = chunk;
            div.append(span);
          }
          i = j;
        }
        // An empty line needs something to have a height and hold the caret.
        if (line === "") div.append(document.createElement("br"));
        lines.push(div);
        start = end + 1;
      }
      editor.replaceChildren(...lines);
      editor.toggleAttribute("data-empty", source === "");
    };

    const commit = (next: Snapshot, kind: EditKind) => {
      const before = getSelection() ?? { text: value(), anchor: value().length, focus: value().length };
      before.text = value();
      const now = Date.now();
      // Typing or deleting a run of characters is undone at once.
      const merge = kind !== "other" && lastEdit.current?.kind === kind && now - lastEdit.current.time < 1000;
      if (!merge && before.text !== next.text) {
        undoStack.current.push(before);
        if (undoStack.current.length > 200) undoStack.current.shift();
      }
      if (before.text !== next.text) redoStack.current = [];
      lastEdit.current = { kind, time: now };
      apply(next);
    };

    const apply = ({ text: next, anchor, focus }: Snapshot) => {
      const changed = next !== value();
      text.current = next;
      render();
      if (document.activeElement === editor) setSelection(anchor, focus);
      if (changed) {
        setLength(next.length);
        onChangeRef.current(next);
      }
    };

    const replace = (start: number, end: number, insert: string, kind: EditKind) => {
      insert = normalize(insert);
      if (maxLength !== undefined) insert = insert.slice(0, Math.max(0, maxLength - (value().length - (end - start))));
      if (start === end && insert === "") return;
      const caret = start + insert.length;
      commit({ text: value().slice(0, start) + insert + value().slice(end), anchor: caret, focus: caret }, kind);
    };

    const history = (from: Snapshot[], to: Snapshot[]) => {
      const snapshot = from.pop();
      if (!snapshot) return;
      to.push(getSelection() ?? { text: value(), anchor: 0, focus: 0 });
      lastEdit.current = null;
      apply(snapshot);
    };

    const selected = () => {
      const selection = getSelection();
      return selection && [Math.min(selection.anchor, selection.focus), Math.max(selection.anchor, selection.focus)] as const;
    };

    // Reads the text back after the browser edited the page itself, which only composition should do.
    const sync = () => {
      let next = Array.from(editor.childNodes, line => line.textContent ?? "").join("\n");
      if (maxLength !== undefined) next = next.slice(0, maxLength);
      if (next === value()) return;
      const selection = getSelection();
      const caret = Math.min(selection?.focus ?? next.length, next.length);
      // The page already shows the new text, so the snapshot taken before it has to come from the previous one.
      undoStack.current.push({ text: value(), anchor: caret, focus: caret });
      redoStack.current = [];
      lastEdit.current = null;
      apply({ text: next, anchor: Math.min(selection?.anchor ?? caret, next.length), focus: caret });
    };

    const onBeforeInput = (e: InputEvent) => {
      if (composing.current || e.inputType === "insertCompositionText") return;
      const range = selected();
      if (!range) return;
      let [start, end] = range;
      const target = e.getTargetRanges()[0];
      if (target) {
        start = toOffset(target.startContainer, target.startOffset) ?? start;
        end = toOffset(target.endContainer, target.endOffset) ?? end;
      }
      const data = e.dataTransfer?.getData("text/plain") ?? e.data ?? "";
      switch (e.inputType) {
        case "insertText": replace(start, end, data, /\s/.test(data) ? "other" : "insert"); break;
        case "insertParagraph": case "insertLineBreak": replace(start, end, "\n", "other"); break;
        case "insertReplacementText": case "insertFromPaste": case "insertFromDrop": case "insertFromYank": replace(start, end, data, "other"); break;
        case "historyUndo": history(undoStack.current, redoStack.current); break;
        case "historyRedo": history(redoStack.current, undoStack.current); break;
        default:
          if (e.inputType.startsWith("delete")) {
            if (!target && start === end) {
              // Without target ranges, let the browser find what the key deletes by moving the selection.
              const direction = /Backward$/.test(e.inputType) ? "backward" : "forward";
              const unit = e.inputType.includes("Word") ? "word" : e.inputType.includes("Line") ? "lineboundary" : "character";
              document.getSelection()?.modify("extend", direction, unit);
              const extended = selected();
              if (extended) [start, end] = extended;
            }
            replace(start, end, "", "delete");
          } else if (!e.inputType.startsWith("format")) return;
      }
      e.preventDefault();
    };

    const onInput = () => { if (!composing.current) sync(); };
    const onCompositionStart = () => { composing.current = true; };
    const onCompositionEnd = () => { composing.current = false; sync(); };

    const onCopy = (e: ClipboardEvent, cut: boolean) => {
      const range = selected();
      if (!range || range[0] === range[1]) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", value().slice(...range));
      if (cut) replace(range[0], range[1], "", "other");
    };
    const onCopyEvent = (e: ClipboardEvent) => onCopy(e, false);
    const onCutEvent = (e: ClipboardEvent) => onCopy(e, true);

    const onPaste = (e: ClipboardEvent) => {
      const range = selected();
      if (!range) return;
      e.preventDefault();
      replace(range[0], range[1], e.clipboardData?.getData("text/plain") ?? "", "other");
    };

    const onDragStart = () => { dragged.current = selected(); };
    const onDragEnd = () => { dragged.current = null; };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const insert = normalize(e.dataTransfer?.getData("text/plain") ?? "");
      const point = document.caretPositionFromPoint?.(e.clientX, e.clientY);
      const range = point ? null : document.caretRangeFromPoint?.(e.clientX, e.clientY);
      const node = point?.offsetNode ?? range?.startContainer;
      let at = node ? toOffset(node, point?.offset ?? range?.startOffset ?? 0) : null;
      if (at === null || !insert) return;
      const source = dragged.current;
      editor.focus();
      if (source && !e.ctrlKey && !e.altKey) {
        // Moving text within the box.
        if (at >= source[0] && at <= source[1]) return;
        if (at > source[1]) at -= source[1] - source[0];
        const without = value().slice(0, source[0]) + value().slice(source[1]);
        commit({ text: without.slice(0, at) + insert + without.slice(at), anchor: at, focus: at + insert.length }, "other");
      } else {
        if (maxLength !== undefined && value().length + insert.length > maxLength) return;
        commit({ text: value().slice(0, at) + insert + value().slice(at), anchor: at, focus: at + insert.length }, "other");
      }
    };

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) history(undoStack.current, redoStack.current);
      else if (key === "y" || (key === "z" && e.shiftKey)) history(redoStack.current, undoStack.current);
      else if (!e.shiftKey && (key === "b" || key === "i" || key === "u")) toggle({ b: "**", i: "*", u: "__" }[key]);
      else return;
      e.preventDefault();
    };

    // Wraps the selection in a marker, or removes it when the selection is already wrapped, like Discord's shortcuts.
    const toggle = (marker: string) => {
      const range = selected();
      if (!range) return;
      const [start, end] = range;
      const source = value();
      const n = marker.length;
      if (source.slice(start - n, start) === marker && source.slice(end, end + n) === marker) {
        commit({ text: source.slice(0, start - n) + source.slice(start, end) + source.slice(end + n), anchor: start - n, focus: end - n }, "other");
      } else if (maxLength === undefined || source.length + 2 * n <= maxLength) {
        commit({ text: source.slice(0, start) + marker + source.slice(start, end) + marker + source.slice(end), anchor: start + n, focus: end + n }, "other");
      }
    };

    render();
    const listeners: [string, (e: never) => void][] = [
      ["beforeinput", onBeforeInput], ["input", onInput], ["compositionstart", onCompositionStart], ["compositionend", onCompositionEnd],
      ["copy", onCopyEvent], ["cut", onCutEvent], ["paste", onPaste], ["dragstart", onDragStart], ["dragend", onDragEnd], ["drop", onDrop],
      ["keydown", onKeyDown],
    ];
    for (const [type, listener] of listeners) editor.addEventListener(type, listener as EventListener);
    return () => { for (const [type, listener] of listeners) editor.removeEventListener(type, listener as EventListener); };
  }, [maxLength]);

  useEffect(() => {
    // Browsers without plaintext-only ignore the value. The content is the same either way since the browser does not edit it.
    const editor = editorRef.current!;
    if (editor.contentEditable !== "plaintext-only") editor.contentEditable = "true";
  }, []);

  // Clicking the label or the border around the text focuses the box, as it would a textarea.
  const focusEnd = (e: React.MouseEvent) => {
    const editor = editorRef.current!;
    if (e.target === editor || editor.contains(e.target as Node)) return;
    e.preventDefault();
    editor.focus();
    document.getSelection()?.selectAllChildren(editor);
    document.getSelection()?.collapseToEnd();
  };

  return (
    <div className={`${fieldStyles.wrapper} ${fieldStyles.wide} ${className ?? ""}`}>
      {label && <span id={labelId} className={fieldStyles.boxLabel} onMouseDown={focusEnd}>{label}</span>}
      <span className={`${fieldStyles.field} ${fieldStyles.box} ${error ? fieldStyles.invalid : ""}`} onMouseDown={focusEnd}>
        <div
          ref={editorRef}
          className={styles.editor}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : placeholder}
          aria-placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || supportingText ? supportingId : undefined}
          data-placeholder={placeholder}
          tabIndex={0}
          spellCheck
          contentEditable="plaintext-only"
          suppressContentEditableWarning/>
      </span>
      <SupportingText id={supportingId} text={error || supportingText} error={!!error} length={length} maxLength={maxLength}/>
    </div>
  );
}
