/**
 * Entry point for the guide 2 page, mounted from guide2.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { Guide2App } from "./guide2-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<Guide2App />);
}
