import { lookupEventIndex } from "@/core2/devices/seq/events/lookup-event";
import type { SeqEvent } from "@/core2/devices/seq/events/types";

const events: SeqEvent[] = [
  { start: 0, end: 1, freq: 262, isRest: false, isTiedFromPrevious: false, isTiedToNext: false },
  { start: 1, end: 2, freq: 0, isRest: true, isTiedFromPrevious: false, isTiedToNext: false },
];

console.log('position 0.9:', lookupEventIndex(events, 0.9), '-> should be 0');
console.log('position 1.0:', lookupEventIndex(events, 1.0), '-> should be 1');
console.log('position 1.1:', lookupEventIndex(events, 1.1), '-> should be 1');
