/**
 * Entry point for the landing page, mounted from index.html.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { LandingApp } from "./landing-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<LandingApp />);
}
