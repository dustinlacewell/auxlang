import { createRoot } from "react-dom/client";
import "@/ui/styles/globals.css";
import { Core2EditorApp } from "./core2-editor-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<Core2EditorApp />);
}
