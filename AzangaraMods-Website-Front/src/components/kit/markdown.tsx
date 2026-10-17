'use client';
import { ReactNode, useMemo, useState } from "react";
import styles from "./markdown.module.css";
import { isSafeUrl, MarkdownNode, parseMarkdown } from "@/utils/markdown";
import { formatRelativeDate } from "@/utils/levelLabels";

const blockTypes = new Set(["codeBlock", "blockQuote", "list", "heading", "subtext"]);

const timestampFormats: Record<string, Intl.DateTimeFormatOptions> = {
  t: { timeStyle: "short" },
  T: { timeStyle: "medium" },
  d: { dateStyle: "short" },
  D: { dateStyle: "long" },
  f: { dateStyle: "long", timeStyle: "short" },
  F: { dateStyle: "full", timeStyle: "short" },
};

/** Renders Discord-flavored Markdown: bold, italics, underline, strikethrough, spoilers, code, quotes, headings, subtext, lists, links and timestamps. */
export default function Markdown({children, className}:{children:string, className?:string}) {
  const nodes = useMemo(()=>parseMarkdown(children), [children]);
  return <div className={`${styles.markdown} ${className ?? ""}`}>{renderNodes(nodes)}</div>;
}

function renderNodes(nodes: MarkdownNode[]): ReactNode[] {
  // Block elements already end their line, so a line break right after one would leave an empty line.
  return nodes
    .filter((node, i) => !(node.type === "br" && i > 0 && blockTypes.has(nodes[i - 1].type)))
    .map((node, i) => renderNode(node, i));
}

function renderNode(node: MarkdownNode, key: number): ReactNode {
  const content = () => renderNodes(node.content);
  switch (node.type) {
    case "text": return node.content;
    case "br": case "newline": return <br key={key}/>;
    case "strong": return <strong key={key}>{content()}</strong>;
    case "em": return <em key={key}>{content()}</em>;
    case "underline": return <u key={key}>{content()}</u>;
    case "strikethrough": return <s key={key}>{content()}</s>;
    case "spoiler": return <Spoiler key={key}>{content()}</Spoiler>;
    case "inlineCode": return <code key={key} className={styles.inlineCode}>{node.content}</code>;
    case "codeBlock": return <pre key={key} className={styles.codeBlock}><code>{node.content}</code></pre>;
    case "blockQuote": return <blockquote key={key} className={styles.quote}>{content()}</blockquote>;
    case "heading": {
      const Heading = (["h2", "h3", "h4"] as const)[node.level - 1] ?? "h4";
      return <Heading key={key} className={styles[`heading${node.level}`]}>{content()}</Heading>;
    }
    case "subtext": return <small key={key} className={styles.subtext}>{content()}</small>;
    case "list": {
      const items = (node.items as MarkdownNode[][]).map((item, i)=><li key={i}>{renderNodes(item)}</li>);
      return node.ordered ?
        <ol key={key} className={styles.list} start={node.start}>{items}</ol>
      :
        <ul key={key} className={styles.list}>{items}</ul>;
    }
    case "url": case "autolink": case "link":
      return isSafeUrl(node.target) ?
        <a key={key} href={node.target} target="_blank" rel="noopener noreferrer nofollow ugc" className={styles.link}>{content()}</a>
      :
        <span key={key}>{content()}</span>;
    case "emoji":
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} className={styles.emoji} alt={`:${node.name}:`} title={`:${node.name}:`} loading="lazy"
        src={`https://cdn.discordapp.com/emojis/${node.id}.${node.animated ? "gif" : "webp"}?size=48`}/>;
    case "timestamp": {
      const date = new Date(Number(node.timestamp) * 1000);
      if (isNaN(date.getTime())) return null;
      const text = node.format === "R" ? formatRelativeDate(date.toISOString()) : date.toLocaleString(undefined, timestampFormats[node.format ?? "f"] ?? timestampFormats.f);
      // The server and the browser format dates in their own time zone and locale.
      return <time key={key} className={styles.timestamp} dateTime={date.toISOString()} title={date.toLocaleString(undefined, timestampFormats.F)} suppressHydrationWarning>{text}</time>;
    }
    default: return Array.isArray(node.content) ? <span key={key}>{content()}</span> : null;
  }
}

function Spoiler({children}:{children:ReactNode}) {
  const [revealed, setRevealed] = useState(false);
  return revealed ?
    <span className={`${styles.spoiler} ${styles.revealed}`}>{children}</span>
  :
    <span className={styles.spoiler} role="button" tabIndex={0} aria-label="Spoiler, click to reveal"
      onClick={()=>setRevealed(true)} onKeyDown={(e)=>{ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRevealed(true); } }}>
      <span aria-hidden>{children}</span>
    </span>;
}
