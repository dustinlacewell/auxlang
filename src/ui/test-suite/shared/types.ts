/**
 * Base types for interactive test/example suites.
 */

export interface BaseExample {
	id: string;
	category: string;
	name: string;
	desc: string;
	code: string;
	filePath: string;
}

export interface DeviceExample extends BaseExample {
	device: string;
}

export interface PatternExample extends BaseExample {
	// No additional fields - just category/id structure
}
