// kick - all params
// Deep kick with long decay and high click
clock(120).seq("c4 ~ c4 ~").trig.kick({ pitch: 40, sweep: 6, decay: 0.5, click: 0.6 }).out()
