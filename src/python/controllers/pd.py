def controller({{args}}):
    Kp = 10.0
    Kd = 2.0

    ref = 0.0
    error = ref - x
    {{out}} = Kp * error - Kd * v

    return {{out}}
