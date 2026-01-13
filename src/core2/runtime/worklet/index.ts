/**
 * Core2 worklet entry point.
 */

// Legacy traverse (to be removed after cursor is verified)
import "@/runtime/worklet/seq-traverse";

// Cursor-based approach (shared with main thread)
import "@/runtime/worklet/seq-cursor-bridge";

import "./processor";
