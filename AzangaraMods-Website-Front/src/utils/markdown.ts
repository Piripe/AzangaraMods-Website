import { rulesExtended, SimpleMarkdown } from "discord-markdown-parser";
import type { Capture, Parser, ParserRules, State } from "discord-markdown-parser/dist/simple-markdown";

export type MarkdownNode = ReturnType<typeof parseMarkdown>[number];

// Same test discord-markdown-parser uses for block quotes: the rule may only start a line.
const atLineStart = (prevSource: string) => /^$|\n *$/.test(prevSource);

// A run of items with the same kind of bullet; more indented items of any kind are nested lists.
const ListRegex = /^( *)(?:([*-]) [^\n]*(?:\n(?:\1 +(?:[*-]|\d+\.)|\1[*-]) [^\n]*)*|(\d+\.) [^\n]*(?:\n(?:\1 +(?:[*-]|\d+\.)|\1\d+\.) [^\n]*)*)\n?/;

// Discord's syntax minus mentions, slash commands and server links, which mean nothing outside Discord.
const {
  blockQuote, codeBlock, newline, escape, autolink, url, link, em, strong, underline, strikethrough,
  inlineCode, text, emoticon, br, spoiler, heading, subtext, emoji, timestamp,
} = rulesExtended;
const rules = {
  blockQuote, codeBlock, newline, escape, autolink, url, link, em, strong, underline, strikethrough,
  inlineCode, text, emoticon, br, spoiler, heading, subtext, emoji, timestamp,
};

const parserRules = {
  ...rules,
  // The library checks the previous capture group, which misses headings right after a quote or a list.
  heading: { ...rules.heading, match: (source, state, prevSource) => atLineStart(prevSource) ? rules.heading.match(source, { ...state, prevCapture: null }, prevSource) : null },
  subtext: { ...rules.subtext, match: (source, state, prevSource) => atLineStart(prevSource) ? rules.subtext.match(source, { ...state, prevCapture: null }, prevSource) : null },
  // The library has no lists. Discord ends a list at the first line that is not an item, unlike Markdown's default rule.
  list: {
    ...SimpleMarkdown.defaultRules.list,
    order: rules.blockQuote.order,
    match: (source, state, prevSource) => {
      const match = atLineStart(prevSource) || state._list ? ListRegex.exec(source) : null;
      // The default parse reads the bullet from the second group.
      return match && Object.assign([match[0], match[1], match[2] ?? match[3]], { index: 0, input: source });
    },
  },
} satisfies ParserRules;

const parser = SimpleMarkdown.parserFor(parserRules);

export const markdownHint = "Supports Discord Markdown: **bold**, *italics*, __underline__, ~~strikethrough~~, ||spoilers||, `code`, # headings, -# subtext, > quotes, - lists and [links](https://…)";

export function parseMarkdown(source: string) {
  return parser(source.replace(/\r\n?/g, "\n"), { inline: true });
}

export function isSafeUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

/** Flattens Markdown for places that only show a line or two of text, such as search results. */
export function markdownToText(nodes: MarkdownNode[]): string {
  return nodes.map(node => {
    switch (node.type) {
      case "spoiler": return "[spoiler]";
      case "br": case "newline": return "\n";
      case "emoji": return `:${node.name}:`;
      case "timestamp": return new Date(Number(node.timestamp) * 1000).toLocaleDateString();
      case "list": return (node.items as MarkdownNode[][]).map(item => markdownToText(item)).join("\n") + "\n";
      case "heading": case "subtext": case "blockQuote": return markdownToText(node.content) + "\n";
      default: return Array.isArray(node.content) ? markdownToText(node.content) : String(node.content ?? "");
    }
  }).join("");
}

/** Per-character styles returned by `highlightMarkdown`. */
export const MarkdownFlags = {
  syntax: 1 << 0,
  bold: 1 << 1,
  italic: 1 << 2,
  underline: 1 << 3,
  strikethrough: 1 << 4,
  spoiler: 1 << 5,
  code: 1 << 6,
  link: 1 << 7,
  mention: 1 << 8,
  // Block styles, which apply to the whole line.
  heading1: 1 << 16,
  heading2: 1 << 17,
  heading3: 1 << 18,
  subtext: 1 << 19,
  quote: 1 << 20,
  codeBlock: 1 << 21,
} as const;
export const blockFlags = 0xffff0000;

const F = MarkdownFlags;
const nodeFlags: Record<string, (capture: Capture) => number> = {
  strong: () => F.bold,
  em: () => F.italic,
  underline: () => F.underline,
  strikethrough: () => F.strikethrough,
  spoiler: () => F.spoiler,
  link: () => F.link,
  url: () => F.link,
  autolink: () => F.link,
  inlineCode: () => F.code,
  codeBlock: () => F.codeBlock,
  emoji: () => F.mention,
  timestamp: () => F.mention,
  heading: (capture) => [F.heading1, F.heading2, F.heading3][capture[1].length - 1] ?? F.heading3,
  subtext: () => F.subtext,
  blockQuote: () => F.quote,
};

/** Characters of the capture that are shown as text, for rules that do not parse their content. */
const leafContent: Record<string, (capture: Capture) => [number, number]> = {
  inlineCode: (capture) => [capture[1].length, capture[0].length - capture[1].length],
  codeBlock: (capture) => {
    const start = capture[3] ? capture[0].indexOf(capture[3], 3) : 3;
    return [start, start + (capture[3]?.length ?? 0)];
  },
  autolink: (capture) => [1, capture[0].length - 1],
  escape: () => [1, 2],
};

type HighlightState = State & { _map: number[], _flags: Uint32Array };

/**
 * Finds where each character of `sub` comes from in `source`, starting at `from`. Rules such as quotes and lists strip
 * their syntax before parsing what is left, so the content is not always a plain substring.
 */
function locate(source: string, sub: string, from: number): number[] {
  const at = source.indexOf(sub, from);
  if (at !== -1) return Array.from({ length: sub.length + 1 }, (_, i) => at + i);
  const indices: number[] = [];
  let cursor = from;
  for (const char of sub) {
    const found = source.indexOf(char, cursor);
    // Characters the rule added itself take no room in the source.
    if (found === -1) indices.push(cursor);
    else { indices.push(found); cursor = found + 1; }
  }
  indices.push(cursor);
  return indices;
}

// Same rules as the renderer, with each parse also writing the styles of the characters it consumed.
const highlightParser = SimpleMarkdown.parserFor(Object.fromEntries(Object.entries(parserRules).map(([type, rule]) => [type, {
  ...rule,
  parse: (capture: Capture, nestedParse: Parser, state: HighlightState) => {
    const { _map: map, _flags: flags } = state;
    // `map` gives the position in the text of each character of the source being parsed, which the capture is the end of.
    const local = map.length - 1 - ((capture as RegExpExecArray).input ?? "").length;
    const positions = map.slice(local, local + capture[0].length + 1);
    const content = new Set<number>();
    let cursor = 0;
    const result = rule.parse(capture, (source, nestedState) => {
      const indices = locate(capture[0], source, cursor);
      cursor = indices[indices.length - 1];
      const subMap = indices.map(i => positions[i]);
      subMap.slice(0, -1).forEach(position => content.add(position));
      return nestedParse(source, { ...(nestedState ?? state), _map: subMap });
    }, state);

    const style = nodeFlags[type]?.(capture) ?? 0;
    const leaf = leafContent[type]?.(capture);
    positions.slice(0, -1).forEach((position, i) => {
      const shown = leaf ? i >= leaf[0] && i < leaf[1] : content.size > 0 ? content.has(position) : true;
      flags[position] |= style | (shown ? 0 : F.syntax);
    });
    return result;
  },
}])) as ParserRules);

/** Styles each character of `source` the way the renderer would show it, keeping the syntax characters visible. */
export function highlightMarkdown(source: string): Uint32Array {
  const flags = new Uint32Array(source.length);
  // The parser expands tabs and drops form feeds, which would shift every position after them.
  highlightParser(source.replace(/[\t\f]/g, " "), { inline: true, _map: Array.from({ length: source.length + 1 }, (_, i) => i), _flags: flags });
  return flags;
}
