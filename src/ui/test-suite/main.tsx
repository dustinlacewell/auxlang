import { createRoot } from "react-dom/client";
import "@/ui/styles/globals.css";
import { TestSuiteApp } from "./test-suite-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<TestSuiteApp />);
}
