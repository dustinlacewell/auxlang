// Simulate the loop from 0 to 1.1 in 0.1 increments
for (let phase = 0; phase <= 1.1; phase += 0.1) {
  console.log('phase:', phase.toFixed(20), 'equals 1.0:', phase === 1.0, '< 1.0:', phase < 1.0);
}
