import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

interface TableToolbarProps {
  table: HTMLTableElement | null;
  open: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getParentCell(node: Node | null): HTMLTableCellElement | null {
  while (node) {
    if (node.nodeName === "TD" || node.nodeName === "TH")
      return node as HTMLTableCellElement;
    node = node.parentNode;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Table DOM manipulation functions
// ---------------------------------------------------------------------------

export function addRowBelow(table: HTMLTableElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const cell = getParentCell(sel.anchorNode);
  if (!cell) return;
  const row = cell.parentElement;
  if (!row || row.tagName !== "TR") return;
  const section = row.parentElement;
  if (!section) return;

  // If in <thead>, insert into <tbody> at position 0 instead
  if (section.tagName === "THEAD") {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const newRow = tbody.insertRow(0);
    const colCount = (row as HTMLTableRowElement).cells.length;
    for (let i = 0; i < colCount; i++) {
      newRow.insertCell().innerHTML = "<br>";
    }
    placeCursorInFirstCell(newRow, sel);
    return;
  }

  const tbody = section as HTMLTableSectionElement;
  const rowIndex = Array.from(tbody.rows).indexOf(row as HTMLTableRowElement);
  const newRow = tbody.insertRow(rowIndex + 1);
  const colCount = (row as HTMLTableRowElement).cells.length;
  for (let i = 0; i < colCount; i++) {
    newRow.insertCell().innerHTML = "<br>";
  }
  placeCursorInFirstCell(newRow, sel);
}

export function addColumnRight(table: HTMLTableElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const cell = getParentCell(sel.anchorNode);
  if (!cell) return;
  const row = cell.parentElement as HTMLTableRowElement;
  const colIndex = Array.from(row.cells).indexOf(cell);
  for (const tr of Array.from(table.rows)) {
    const td = tr.insertCell(colIndex + 1);
    td.innerHTML = "<br>";
  }
}

export function deleteRow(table: HTMLTableElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const cell = getParentCell(sel.anchorNode);
  if (!cell) return;
  const row = cell.parentElement as HTMLTableRowElement;
  const section = row.parentElement;
  if (!section) return;

  // Keep at least one row in <tbody>
  if (
    section.tagName === "TBODY" &&
    (section as HTMLTableSectionElement).rows.length <= 1
  ) {
    return;
  }
  row.remove();
}

export function deleteColumn(table: HTMLTableElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const cell = getParentCell(sel.anchorNode);
  if (!cell) return;
  const row = cell.parentElement as HTMLTableRowElement;
  const colIndex = Array.from(row.cells).indexOf(cell);

  // Keep at least one column
  if (table.rows.length > 0 && table.rows[0].cells.length <= 1) return;

  for (const tr of Array.from(table.rows)) {
    if (tr.cells[colIndex]) tr.cells[colIndex].remove();
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function placeCursorInFirstCell(
  row: HTMLTableRowElement,
  sel: Selection,
): void {
  const firstCell = row.cells[0];
  if (!firstCell) return;
  const range = document.createRange();
  range.selectNodeContents(firstCell);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TableToolbar({ table, open }: TableToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !table) {
      setPosition(null);
      return;
    }
    const rect = table.getBoundingClientRect();
    setPosition({
      top: rect.top - 6,
      left: rect.left + rect.width / 2,
    });
  }, [open, table]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent losing focus from contenteditable
    e.preventDefault();
  }, []);

  if (!open || !position) return null;

  const buttons = [
    {
      key: "addRowBelow" as const,
      icon: Plus,
      label: "Row Below",
      onClick: () => table && addRowBelow(table),
    },
    {
      key: "addColRight" as const,
      icon: Plus,
      label: "Col Right",
      onClick: () => table && addColumnRight(table),
    },
    {
      key: "deleteRow" as const,
      icon: Minus,
      label: "Delete Row",
      onClick: () => table && deleteRow(table),
    },
    {
      key: "deleteCol" as const,
      icon: Minus,
      label: "Delete Col",
      onClick: () => table && deleteColumn(table),
    },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: "translate(-50%, -100%)",
          }}
          onMouseDown={onMouseDown}
          className="z-[9999] glass border border-border rounded-[8px] shadow-lg p-1 flex gap-0.5"
        >
          {buttons.map((btn) => (
            <button
              key={btn.key}
              onClick={btn.onClick}
              onMouseDown={onMouseDown}
              className="p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05]
                         transition-colors duration-100 flex items-center gap-1
                         text-[11px] text-editor-text/60 hover:text-editor-text"
            >
              <btn.icon className="w-3 h-3" strokeWidth={1.5} />
              <span>{btn.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
