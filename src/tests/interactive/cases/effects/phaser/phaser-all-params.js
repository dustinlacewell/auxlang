// phaser - all params
// Fast rate, deep sweep, high feedback, fully wet - a swirling resonant sweep
saw({ freq: 110 }).phaser({ rate: 1.2, depth: 0.9, feedback: 0.6, mix: 0.8 }).gain(0.3).out()
