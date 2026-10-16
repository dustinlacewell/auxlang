/**
 * Entry point for the module-code page, mounted from module-code.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { ModuleCodeApp } from "./module-code-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<ModuleCodeApp />);
}
