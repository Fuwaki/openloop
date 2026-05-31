def controller({{args}}):
    q1 = ol.parameter("q1", 10.0, min=0.1, max=100.0, step=0.5)
    q2 = ol.parameter("q2", 1.0, min=0.1, max=100.0, step=0.5)
    r = ol.parameter("r", 0.1, min=0.01, max=10.0, step=0.01)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # LQR for 2nd-order double integrator: A=[[0,1],[0,0]], B=[[0],[1]]
    # Continuous-time ARE: A'P + PA - PBR^{-1}B'P + Q = 0
    # Analytical solution for this structure:
    #   K = [sqrt(q1 + 2*sqrt(q2/r_eff)) * sqrt(r_eff), sqrt(q2/r_eff) + ...]
    # Simplified closed-form using Bryson's rule scaling:
    r_eff = max(r, 1e-6)
    # For double integrator with Q=diag(q1,q2), R=r:
    # K[0] = sqrt(q1/r) (position gain), K[1] = sqrt(2*sqrt(q1/r) + q2/r) (velocity gain)
    k0 = np.sqrt(q1 / r_eff)
    k1 = np.sqrt(2.0 * k0 + q2 / r_eff)
    K = np.array([k0, k1])

    err = np.array([q - target, q_dot if 'q_dot' in globals() or 'q_dot' in locals() else 0.0])
    virtual_u = -float(K @ err)
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("gain_K0", float(K[0]))
    ol.status("gain_K1", float(K[1]))
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
