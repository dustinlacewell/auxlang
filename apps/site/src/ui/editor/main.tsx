import { createRoot } from "react-dom/client";
import "@/ui/design/globals.css";
import "auxlang/library/all";
import { EditorApp } from "./editor-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<EditorApp />);
}
