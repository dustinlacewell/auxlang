/**
 * Entry point for the pattern-docs page, mounted from pattern-tests.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { PatternDocsApp } from "./pattern-docs-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<PatternDocsApp />);
}
