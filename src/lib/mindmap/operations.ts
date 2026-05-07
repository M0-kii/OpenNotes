// Shared operations for the mind-map editor.

import { applyBatch, applyOperation } from "./dispatch";
import type {
  MindmapGraphV2,
  OpResult,
  UserOperation,
} from "./types";

export const user = {
  apply(graph: MindmapGraphV2, op: UserOperation): OpResult {
    return applyOperation(graph, op);
  },
  applyBatch(graph: MindmapGraphV2, ops: UserOperation[]): OpResult {
    return applyBatch(graph, ops);
  },
};
