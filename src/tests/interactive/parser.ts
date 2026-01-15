/**
 * Parser for interactive test case files.
 *
 * File format:
 *   // $name
 *   // $desc
 *   $code
 *
 * File path structure:
 *   cases/$category/$device/$test-id.js
 */

export interface ParsedTestCase {
	name: string;
	desc: string;
	code: string;
}

export interface TestCaseFile extends ParsedTestCase {
	id: string;
	category: string;
	device: string;
	filePath: string;
}

/**
 * Parse a test case file content.
 */
export function parseTestCase(content: string): ParsedTestCase {
	// Normalize line endings (CRLF -> LF)
	const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const lines = normalized.split("\n");
	let name = "";
	let desc = "";
	let codeStartLine = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const trimmed = line.trim();

		if (trimmed.startsWith("//")) {
			const commentContent = trimmed.slice(2).trim();
			if (!name) {
				name = commentContent;
			} else if (!desc) {
				desc = commentContent;
				codeStartLine = i + 1;
			}
		} else if (trimmed !== "") {
			// First non-comment, non-empty line starts the code
			if (!codeStartLine) {
				codeStartLine = i;
			}
			break;
		}
	}

	const code = lines.slice(codeStartLine).join("\n").trim();

	return { name, desc, code };
}

/**
 * Serialize a test case to file content.
 */
export function serializeTestCase(test: ParsedTestCase): string {
	return `// ${test.name}\n// ${test.desc}\n${test.code}\n`;
}

/**
 * Extract category/device/id from file path.
 * Path format: cases/$category/$device/$id.js
 */
export function parseFilePath(filePath: string): { category: string; device: string; id: string } | null {
	// Normalize path separators
	const normalized = filePath.replace(/\\/g, "/");

	// Match pattern: cases/category/device/id.js
	const match = normalized.match(/cases\/([^/]+)\/([^/]+)\/([^/]+)\.js$/);
	if (!match) return null;

	return {
		category: match[1]!,
		device: match[2]!,
		id: match[3]!,
	};
}

/**
 * Generate file path from test metadata.
 */
export function generateFilePath(category: string, device: string, id: string): string {
	return `cases/${category}/${device}/${id}.js`;
}

/**
 * Convert category slug to display name.
 * e.g., "oscillators" -> "Oscillators"
 */
export function categoryToDisplayName(slug: string): string {
	return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Convert display name to category slug.
 * e.g., "Oscillators" -> "oscillators"
 */
export function displayNameToCategory(name: string): string {
	return name.toLowerCase();
}
