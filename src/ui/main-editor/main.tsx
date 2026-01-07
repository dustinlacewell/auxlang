import { createRoot } from "react-dom/client";
import "@/ui/styles/globals.css";
import { EditorApp } from "./editor-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<EditorApp />);
}
