import { saw, lpf, delay } from '../../editor/api';
import { isDescriptor } from '../../descriptor/guards/is-descriptor';
import { isOutputRef } from '../../descriptor/guards/is-output-ref';

// Build a chain
const chain = saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 });

console.log('=== Chain (delay at tail) ===');
console.log('id:', chain._state.id);
console.log('spec name:', chain._state.spec);
console.log('bindings:', chain._state.inputBindings);

// Walk upstream
function walkUpstream(desc: any, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}Descriptor ${desc._state.id}`);
  console.log(`${indent}  bindings:`, desc._state.inputBindings);

  for (const [name, binding] of Object.entries(desc._state.inputBindings)) {
    if (isOutputRef(binding)) {
      console.log(`${indent}  ${name} -> OutputRef to ${(binding as any).descriptorId}`);
    }
  }
}

console.log('\n=== Walking from tail ===');
walkUpstream(chain);

// The binding.descriptorId points to upstream descriptors, but we don't have
// a registry to look them up. The descriptors exist as JS objects but we
// only have their IDs in the bindings.

// Let's see if we can find the head (saw) by following the chain
const sawDesc = saw();
const lpfDesc = sawDesc.lpf({ cutoff: 2000 });
const delayDesc = lpfDesc.delay({ time: 0.1 });

console.log('\n=== Building step by step ===');
console.log('saw id:', sawDesc._state.id);
console.log('saw bindings:', sawDesc._state.inputBindings);
console.log('lpf id:', lpfDesc._state.id);
console.log('lpf bindings:', lpfDesc._state.inputBindings);
console.log('delay id:', delayDesc._state.id);
console.log('delay bindings:', delayDesc._state.inputBindings);
