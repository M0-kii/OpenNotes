export interface SlashCommand {
  id: string;
  label: string;
  icon: string;
  template: string;
}

export const slashCommands: SlashCommand[] = [
  {
    id: "h1",
    label: "Heading 1",
    icon: "Heading1",
    template: "<h1><br></h1>",
  },
  {
    id: "h2",
    label: "Heading 2",
    icon: "Heading2",
    template: "<h2><br></h2>",
  },
  {
    id: "h3",
    label: "Heading 3",
    icon: "Heading3",
    template: "<h3><br></h3>",
  },
  {
    id: "ul",
    label: "Bullet List",
    icon: "List",
    template: "<ul><li><br></li></ul>",
  },
  {
    id: "ol",
    label: "Numbered List",
    icon: "ListOrdered",
    template: "<ol><li><br></li></ol>",
  },
  {
    id: "quote",
    label: "Quote",
    icon: "Quote",
    template: "<blockquote><br></blockquote>",
  },
  {
    id: "code",
    label: "Code Block",
    icon: "Code",
    template: '<pre data-language="plaintext"><code><br></code></pre>',
  },
  {
    id: "table",
    label: "Table",
    icon: "Table",
    template:
      '<table><thead><tr><th>Header</th><th>Header</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table>',
  },
];
