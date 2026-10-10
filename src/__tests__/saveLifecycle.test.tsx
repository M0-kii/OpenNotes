import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { FLUSH_EDITORS_EVENT, useSaveLifecycle } from "../hooks/useSaveLifecycle";

const windowApi = vi.hoisted(() => ({
  destroy: vi.fn(), onCloseRequested: vi.fn(),
}));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => windowApi }));

beforeEach(() => { windowApi.destroy.mockResolvedValue(undefined); windowApi.onCloseRequested.mockResolvedValue(vi.fn()); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("window save lifecycle", () => {
  it("collects editor DOM edits and waits for SQLite before closing", async () => {
    let release!: (saved: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>((resolve) => { release = resolve; }));
    const collect = vi.fn();
    window.addEventListener(FLUSH_EDITORS_EVENT, collect);
    const { result } = renderHook(() => useSaveLifecycle(save));
    const closing = result.current();
    expect(collect).toHaveBeenCalledOnce();
    expect(windowApi.destroy).not.toHaveBeenCalled();
    release(true);
    await closing;
    expect(windowApi.destroy).toHaveBeenCalledOnce();
    window.removeEventListener(FLUSH_EDITORS_EVENT, collect);
  });

  it("keeps the app open if persistence fails", async () => {
    const { result } = renderHook(() => useSaveLifecycle(vi.fn().mockResolvedValue(false)));
    await result.current();
    expect(windowApi.destroy).not.toHaveBeenCalled();
  });

  it("guards native close requests, including Alt+F4", async () => {
    renderHook(() => useSaveLifecycle(vi.fn().mockResolvedValue(false)));
    const event = { preventDefault: vi.fn() };
    await act(async () => { await windowApi.onCloseRequested.mock.calls[0][0](event); });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(windowApi.destroy).not.toHaveBeenCalled();
  });

  it("flushes on blur and disposes a listener registered after unmount", async () => {
    let register!: (dispose: () => void) => void;
    windowApi.onCloseRequested.mockReturnValueOnce(new Promise((resolve) => { register = resolve; }));
    const save = vi.fn().mockResolvedValue(true);
    const { unmount } = renderHook(() => useSaveLifecycle(save));
    window.dispatchEvent(new Event("blur"));
    expect(save).toHaveBeenCalledOnce();
    unmount();
    const dispose = vi.fn();
    await act(async () => { register(dispose); });
    expect(dispose).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("blur"));
    expect(save).toHaveBeenCalledOnce();
  });
});
