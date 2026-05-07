// Operation namespaces.
//
// `user.*` exposes the full operation surface. `ai.*` exposes a subset that
// excludes pin_node / unpin_node — by construction the AI cannot place in
// pixel space; positioning stays a human prerogative. The eventual LLM tool
// layer is a one-line wrapper around `ai.*`.

import { applyBatch, applyOperation } from "./dispatch";
import type {
  AiOperation,
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

export const ai = {
  apply(graph: MindmapGraphV2, op: AiOperation): OpResult {
    return applyOperation(graph, op);
  },
  applyBatch(graph: MindmapGraphV2, ops: AiOperation[]): OpResult {
    return applyBatch(graph, ops);
  },
};
