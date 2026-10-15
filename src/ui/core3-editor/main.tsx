import { createRoot } from "react-dom/client";
import "@/ui/styles/globals.css";
import "@/core3/modules/all";
import { setBackend } from "@/core3/runtime/audio";
import { backendFromUrl } from "./backend-url";
import { EditorApp } from "./editor-app";

const backend = backendFromUrl();
if (backend !== null) {
	setBackend(backend);
	console.info(`core3: playing on the ${backend} backend`);
}

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<EditorApp />);
}
