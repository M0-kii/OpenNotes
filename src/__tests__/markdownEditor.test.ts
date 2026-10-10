import { afterEach, describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "../components/editor/markdownUtils";
import { applyMarkdownShortcutsInBlock, highlightWikilinks } from "../components/editor/editorDom";

function container(html: string) {
  const node = document.createElement("div");
  node.innerHTML = html;
  document.body.append(node);
  return node;
}

afterEach(() => { document.body.replaceChildren(); window.getSelection()?.removeAllRanges(); });

describe("editor round trips", () => {
  it("preserves headings, bold, italic, strike, code, lists and quotes", () => {
    const markdown = "# Title\n\n**bold** and *italic* and ~~gone~~ and `code`\n\n- first\n- second\n\n> quote";
    const reloaded = container(markdownToHtml(htmlToMarkdown(markdownToHtml(markdown))));
    for (const tag of ["h1", "strong", "em", "del", "code", "ul", "blockquote"]) {
      expect(reloaded.querySelector(tag)).not.toBeNull();
    }
    expect(reloaded.querySelectorAll("li")).toHaveLength(2);
    expect(reloaded.textContent).toContain("quote");
  });

  it("preserves table cells and formatting after editing and reloading", () => {
    const table = container(markdownToHtml("| Name | Value |\n| --- | --- |\n| A | B |"));
    table.querySelector("td")!.innerHTML = "<strong>edited</strong>";
    const reloaded = container(markdownToHtml(htmlToMarkdown(table.innerHTML)));
    expect(reloaded.querySelectorAll("td")).toHaveLength(2);
    expect(reloaded.querySelector("td strong")?.textContent).toBe("edited");
    expect(reloaded.querySelectorAll("th")).toHaveLength(2);
  });

  it("preserves a table without headers", () => {
    const md = htmlToMarkdown("<table><tr><td>one</td><td>two</td></tr></table>");
    expect(container(markdownToHtml(md)).querySelectorAll("td")).toHaveLength(2);
  });

  it("preserves code languages and excludes syntax-highlighting labels", () => {
    const html = '<pre data-language="rust"><code class="language-rust"><span class="token keyword">let</span> x = 1;</code><span class="code-lang-label">rust</span></pre>';
    const md = htmlToMarkdown(html);
    expect(md).toContain("```rust");
    expect(md).toContain("let x = 1;");
    expect(md.match(/rust/g)).toHaveLength(1);
  });

  it("preserves wikilink aliases, quotes, and literal markup without injecting HTML", () => {
    const node = container("<p></p>");
    node.firstChild!.textContent = 'See [[a" title|<img src=x onerror=alert(1)>]] here';
    highlightWikilinks(node);
    highlightWikilinks(node);
    expect(node.querySelectorAll(".wiki-link")).toHaveLength(1);
    expect(node.querySelector("img")).toBeNull();
    expect(htmlToMarkdown(node.innerHTML)).toBe('See [[a" title|<img src=x onerror=alert(1)>]] here');
    const reload = container(markdownToHtml(htmlToMarkdown(node.innerHTML)));
    highlightWikilinks(reload);
    expect(reload.querySelector("img")).toBeNull();
    expect(reload.querySelector(".wiki-link")?.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("leaves wikilinks inside code literal", () => {
    const node = container("<pre><code>[[Literal]]</code></pre>");
    highlightWikilinks(node);
    expect(node.querySelector(".wiki-link")).toBeNull();
  });

  it("removes executable HTML and dangerous URLs on load and serialization", () => {
    const unsafe = '<script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">link</a><iframe src=x></iframe>';
    const node = container(markdownToHtml(unsafe));
    expect(node.querySelector("script, iframe, [onerror], [href^='javascript:']")).toBeNull();
    expect(htmlToMarkdown(unsafe)).not.toContain("javascript:");
  });

  it("keeps Unicode, RTL text, and literal angle brackets", () => {
    const text = "سلام دنیا <hello> & goodbye";
    const node = container("<p></p>");
    node.firstChild!.textContent = text;
    expect(container(markdownToHtml(htmlToMarkdown(node.innerHTML))).textContent?.trim()).toBe(text);
  });
});

describe("live shortcuts", () => {
  function shortcut(text: string) {
    const root = container("<p></p>");
    const block = root.firstElementChild as HTMLElement;
    block.textContent = text;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(false);
    window.getSelection()!.addRange(range);
    return { root, range: applyMarkdownShortcutsInBlock(block) };
  }

  it("keeps heading text and returns a caret inside the converted heading", () => {
    const { root, range } = shortcut("# My title");
    expect(root.querySelector("h1")?.textContent).toBe("My title");
    expect(range?.startContainer.textContent).toBe("My title");
    expect(range?.startOffset).toBe(8);
  });

  it("converts inline shortcuts without turning literal markup into elements", () => {
    const { root, range } = shortcut('**<img src=x onerror=alert(1)>**');
    expect(root.querySelector("strong")?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(root.querySelector("img")).toBeNull();
    expect(range?.startOffset).toBe("<img src=x onerror=alert(1)>".length);
  });
});
