/**
 * Test if Float32Array cloning works correctly
 */

function testClone() {
	// Create a buffer with some data
	const original = new Float32Array(10);
	for (let i = 0; i < 10; i++) {
		original[i] = i * 0.1;
	}

	console.log("Original:", Array.from(original));

	// Clone it like deepCloneState does
	const cloned = new Float32Array(original);

	console.log("Cloned:", Array.from(cloned));

	// Modify original
	original[5] = 999;

	console.log("After modifying original[5]:");
	console.log("  Original:", Array.from(original));
	console.log("  Cloned:", Array.from(cloned));

	// Check if they're independent
	console.log("\nClone is independent:", cloned[5] !== 999);
}

testClone();
