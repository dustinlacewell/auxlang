/**
 * Entry point for the about page, mounted from about.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { AboutApp } from "./about-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<AboutApp />);
}
