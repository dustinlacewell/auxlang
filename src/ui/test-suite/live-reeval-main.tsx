import { createRoot } from "react-dom/client";
import "@/ui/styles/globals.css";
import { LiveReEvalTest } from "./live-reeval-test";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<LiveReEvalTest />);
}
