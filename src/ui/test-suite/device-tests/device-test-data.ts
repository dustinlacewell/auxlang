/**
 * Re-export device test data from the tests directory.
 */
export {
	tests,
	getTestsByCategory,
	getCategories,
	getDevices,
	getDevicesByCategory,
	getTestsByCategoryAndDevice,
} from "@/tests/interactive/test-data";

// Re-export the type with our preferred name
export type { TestDefinition as DeviceExample } from "@/tests/interactive/test-data";
