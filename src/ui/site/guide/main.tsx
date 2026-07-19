/**
 * Entry point for the guide page, mounted from guide.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { GuideApp } from "./guide-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<GuideApp />);
}
