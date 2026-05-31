def controller({{args}}):
    c = ol.parameter("c", 5.0, min=0.5, max=20.0, step=0.5)
    eta = ol.parameter("eta", 2.0, min=0.1, max=10.0, step=0.1)
    phi = ol.parameter("phi", 0.5, min=0.01, max=5.0, step=0.01)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    e = target - q
    s = c * e + (e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0)

    # 边界层：用 sat(s/phi) 替代 sign(s)，消除抖振
    if abs(s) < phi:
        virtual_u = eta * s / phi
    else:
        virtual_u = eta * np.sign(s)

    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("sliding_surface", s)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
