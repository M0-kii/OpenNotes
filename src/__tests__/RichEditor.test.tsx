import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RichEditor from "../components/editor/RichEditor";
import { FLUSH_EDITORS_EVENT } from "../hooks/useSaveLifecycle";

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("rich editor interactions", () => {
  it("waits for IME composition to finish before emitting content", () => {
    const onChange = vi.fn();
    render(<RichEditor content="old" onContentChange={onChange} />);
    const editor = screen.getByRole("textbox", { name: "Note content" });
    fireEvent.compositionStart(editor);
    editor.innerHTML = "<p>سلام</p>";
    fireEvent.input(editor);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.compositionEnd(editor);
    expect(onChange).toHaveBeenLastCalledWith("سلام");
  });

  it("collects DOM-only changes on shutdown without waiting for the interval", () => {
    const onChange = vi.fn();
    render(<RichEditor content="old" onContentChange={onChange} />);
    screen.getByRole("textbox").innerHTML = "<p>context menu edit</p>";
    window.dispatchEvent(new Event(FLUSH_EDITORS_EVENT));
    expect(onChange).toHaveBeenLastCalledWith("context menu edit");
  });

  it("does not echo stale content when the parent callback changes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = render(<RichEditor content="old" onContentChange={first} />);
    view.rerender(<RichEditor content="external" onContentChange={second} />);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox").textContent).toContain("external");
  });

  it("preserves the link target and alias when saving an edited note", () => {
    const onChange = vi.fn();
    render(<RichEditor content="See [[Target|Alias]]" onContentChange={onChange} />);
    const editor = screen.getByRole("textbox");
    editor.append(document.createTextNode(" updated"));
    fireEvent.input(editor);
    expect(onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]).toContain("[[Target|Alias]]");
  });
});
