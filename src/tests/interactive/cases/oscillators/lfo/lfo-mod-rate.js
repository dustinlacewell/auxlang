// sin as lfo - modulated freq
// Sine with freq modulated by another sine
saw(sin(sin(0.1, 0.5, 4), 200, 400)).out()
