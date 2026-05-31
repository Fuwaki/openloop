def controller({{args}}):
    c1 = ol.parameter("c1", 5.0, min=0.5, max=20.0, step=0.5)
    c2 = ol.parameter("c2", 3.0, min=0.5, max=20.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # Step 1: z1 = q - target, alpha1 = -c1 * z1
    z1 = q - target
    alpha1 = -c1 * z1

    # Step 2: z2 = q_dot - alpha1
    q_dot_val = q_dot if 'q_dot' in globals() or 'q_dot' in locals() else 0.0
    z2 = q_dot_val - alpha1

    # Stabilizing law: virtual_u = -c2*z2 - z1 + d(alpha1)/dt
    # d(alpha1)/dt = -c1 * z1_dot = -c1 * q_dot
    alpha1_dot = -c1 * q_dot_val
    virtual_u = -c2 * z2 - z1 + alpha1_dot
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", z1)
    ol.status("alpha1", alpha1)
    ol.status("z2", z2)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
