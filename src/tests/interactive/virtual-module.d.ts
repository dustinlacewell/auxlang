/**
 * Type declaration for the virtual:interactive-tests module.
 */

declare module "virtual:interactive-tests" {
	export interface TestDefinition {
		id: string;
		category: string;
		device: string;
		name: string;
		desc: string;
		code: string;
		filePath: string;
	}

	const tests: TestDefinition[];
	export default tests;
}
