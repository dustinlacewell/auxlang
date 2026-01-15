/**
 * Type declaration for the virtual:pattern-tests module.
 */

declare module "virtual:pattern-tests" {
	export interface PatternTestDefinition {
		id: string;
		category: string;
		name: string;
		desc: string;
		code: string;
		filePath: string;
	}

	const tests: PatternTestDefinition[];
	export default tests;
}
