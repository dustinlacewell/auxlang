/**
 * Entry point for the device test suite.
 */

import "@/ui/styles/globals.css";
import { createRoot } from "react-dom/client";
import { DeviceTestApp } from "./device-test-app";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(<DeviceTestApp />);
}
