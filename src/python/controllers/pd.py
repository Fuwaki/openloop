def controller({{args}}):
    Kp = ol.parameter("Kp", 10.0, min=0.0, max=100.0, step=0.1)
    Kd = ol.parameter("Kd", 2.0, min=0.0, max=20.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    e = target - q
    virtual_u = Kp * e + Kd * e_dot
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
