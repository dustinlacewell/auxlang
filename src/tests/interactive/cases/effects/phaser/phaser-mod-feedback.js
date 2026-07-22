// phaser - modulated feedback
// LFO opens feedback 0.1 to 0.85 - the notches sharpen into a resonant peak
saw({ freq: 110 }).phaser({ feedback: lfo(0.2, 0.1, 0.85) }).gain(0.3).out()
