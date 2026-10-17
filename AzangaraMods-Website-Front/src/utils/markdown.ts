import { rulesExtended, SimpleMarkdown } from "discord-markdown-parser";

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

const parser = SimpleMarkdown.parserFor({
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
});

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
