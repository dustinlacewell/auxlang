// phaser - modulated mix
// LFO crossfades mix 0 to 1 - swings between dry saw and full phaser wash
saw({ freq: 110 }).phaser(0.5, 0.7, lfo(0.2, 0, 1)).gain(0.3).out()
