def controller({{args}}):
    k1 = ol.parameter("k1", 1.0, min=0.1, max=50.0, step=0.1)
    k2 = ol.parameter("k2", 1.0, min=0.1, max=50.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    K = np.array([k1, k2])   # 预设增益
    err = np.array([q - target, q_dot])
    virtual_u = -K @ err
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
