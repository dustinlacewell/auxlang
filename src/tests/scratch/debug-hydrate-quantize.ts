/**
 * Debug hydration of the quantize process function
 */

// The exact processSource from the pipeline debug output
const source = `process(inp,cfg,state,_sampleRate){const inputFreq=inp.input??440;const root=inp.root??0;const octave=inp.octave??3;const range=inp.range??4;const scaleName=cfg.scaleName??"major";const scales=cfg.scales;const semitones=scales[scaleName]??scales.major??[0,2,4,5,7,9,11];const cacheKey=\`\${scaleName}-\${root}-\${octave}-\${range}\`;if(state.cacheKey!==cacheKey){state.cacheKey=cacheKey;const freqs=[];const rootMidi=12+octave*12+root;const halfRange=range/2;const startOct=Math.floor(-halfRange);const endOct=Math.ceil(halfRange);const minSemi=rootMidi+startOct*12;const maxSemi=rootMidi+range*12+startOct*12;for(let oct=startOct;oct<endOct;oct++){for(let i=0;i<semitones.length;i++){const semi=semitones[i];if(semi!==void 0){const midi=rootMidi+oct*12+semi;if(midi>=minSemi&&midi<=maxSemi){freqs.push(440*Math.pow(2,(midi-69)/12))}}}}state.frequencies=freqs.sort((a,b)=>a-b)}const frequencies=state.frequencies;let nearest=440;let minDist=Infinity;for(let i=0;i<frequencies.length;i++){const freq=frequencies[i];if(freq!==void 0){const dist=Math.abs(inputFreq-freq);if(dist<minDist){minDist=dist;nearest=freq}}}return{freq:nearest}}`;

console.log("Source length:", source.length);
console.log("Source starts with:", source.slice(0, 50));

// Apply the same normalization as hydrateFunction
let normalized = source;
const regex = /^\w+\s*\(/;
console.log("Regex test:", regex.test(source));
console.log("Starts with function:", source.startsWith("function"));
console.log("Includes arrow:", source.includes("=>"));

if (regex.test(source) && !source.startsWith("function") && !source.includes("=>")) {
	normalized = `function ${source}`;
	console.log("Applied function prefix");
} else {
	console.log("Did NOT apply function prefix");
}

console.log("Normalized starts with:", normalized.slice(0, 60));

// Try hydration
try {
	const fn = new Function(`return (${normalized})`)();
	console.log("Hydration OK, typeof:", typeof fn);
} catch (e) {
	console.log("Hydration FAILED:", e);
	console.log("\nFull normalized source:");
	console.log(normalized);
}
