integral = 0.0
last_t = None

def controller({{args}}):
    global integral, last_t

    Kp = ol.parameter("Kp", 10.0, min=0.0, max=100.0, step=0.1)
    Ki = ol.parameter("Ki", 1.0, min=0.0, max=50.0, step=0.1)
    Kd = ol.parameter("Kd", 2.0, min=0.0, max=20.0, step=0.1)
    i_max = ol.parameter("i_max", 5.0, min=0.1, max=50.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)
    last_t = t
    e = target - q

    # 积分器限幅，防止 windup
    integral += e * dt
    integral = max(-i_max, min(i_max, integral))

    derivative = e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0
    virtual_u = Kp * e + Ki * integral + Kd * derivative
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("integral", integral)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
