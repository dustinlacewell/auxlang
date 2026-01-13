/**
 * Worklet entry point.
 *
 * This module is loaded via audioContext.audioWorklet.addModule().
 * It sets up global utilities and registers the graph processor.
 */

// Legacy traverse (to be removed after cursor is verified)
import "./seq-traverse";

// Cursor-based approach (shared with main thread)
import "./seq-cursor-bridge";

// Now safe to import processor which registers the worklet
import "./processor";
