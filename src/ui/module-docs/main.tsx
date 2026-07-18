/**
 * Entry point for the module-docs page, mounted from test-suite.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { ModuleDocsApp } from "./module-docs-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<ModuleDocsApp />);
}
