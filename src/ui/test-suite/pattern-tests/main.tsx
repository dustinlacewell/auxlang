/**
 * Entry point for the pattern test suite.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { PatternTestApp } from "./pattern-test-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<PatternTestApp />);
}
