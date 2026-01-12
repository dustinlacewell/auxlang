import { clock, saw, seq } from '../../editor/api';
import { isPoly } from '../../descriptor/poly';
import { isPolyOutputRef } from '../../descriptor/proxy/poly-output-proxy';
import { isPlainParamsObject } from '../../descriptor/guards/is-params-object';

const s = clock(120).seq('{c4,e4}');
console.log('s isPoly:', isPoly(s));

const cv = (s as any).cv;
console.log('cv is PolyOutputRef:', isPolyOutputRef(cv));
console.log('cv isPlainParamsObject:', isPlainParamsObject(cv));

const saws = saw(cv);
console.log('saws isPoly:', isPoly(saws));
if (!isPoly(saws)) {
  console.log('saws _state:', (saws as any)._state);
  console.log('saws _state.inputBindings:', (saws as any)._state?.inputBindings);
}
