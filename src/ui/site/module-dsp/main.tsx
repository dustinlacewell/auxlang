/**
 * Entry point for the module-dsp page, mounted from module-dsp.html.
 */

import "@/ui/design/globals.css";
import { createRoot } from "react-dom/client";
import { ModuleDspApp } from "./module-dsp-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<ModuleDspApp />);
}
