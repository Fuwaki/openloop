comp_state = 0.0
last_t = None

def controller({{args}}):
    global comp_state, last_t

    K = ol.parameter("K", 1.0, min=0.1, max=10.0, step=0.1)
    z = ol.parameter("z", 1.0, min=0.1, max=10.0, step=0.1)
    p = ol.parameter("p", 10.0, min=1.0, max=100.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)
    last_t = t

    e = target - q
    comp_state += dt * (-p * comp_state + e)
    virtual_u = K * (z * e + (p - z) * comp_state)
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("comp_state", comp_state)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
