import { createRoot } from "react-dom/client";
import "@/ui/styles/globals.css";
import { TestSuiteAppCore1 } from "./test-suite-app-core1";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<TestSuiteAppCore1 />);
}
