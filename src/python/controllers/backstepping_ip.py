def controller({{args}}):
    c1 = ol.parameter("c1", 5.0, min=0.5, max=20.0, step=0.5)
    c2 = ol.parameter("c2", 3.0, min=0.5, max=20.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # 倒立摆专用反步法，含完整非线性补偿
    M = 0.5
    m = 0.2
    l = 0.3
    g = 9.81

    sin_th = np.sin(q)
    cos_th = np.cos(q)

    # Step 1: z1 = theta - target, alpha1 = -c1 * z1
    z1 = q - target
    alpha1 = -c1 * z1

    # Step 2: z2 = omega - alpha1
    omega_val = q_dot if 'q_dot' in globals() or 'q_dot' in locals() else 0.0
    z2 = omega_val - alpha1
    alpha1_dot = -c1 * omega_val

    # 控制律: theta_ddot_desired = -c2*z2 - z1 + alpha1_dot
    theta_ddot_desired = -c2 * z2 - z1 + alpha1_dot

    # 奇异保护
    cos_safe = cos_th if abs(cos_th) > 0.01 else 0.01 * (1.0 if cos_th >= 0 else -1.0)

    # 从 theta_ddot_desired 解出 F
    x_ddot_desired = (g * sin_th - l * theta_ddot_desired) / cos_safe
    F = (M + m) * x_ddot_desired + m * l * theta_ddot_desired * cos_th - m * l * omega_val ** 2 * sin_th

    {{out}} = F
    ol.status("error", z1)
    ol.status("alpha1", alpha1)
    ol.status("z2", z2)
    ol.status("theta_ddot_desired", theta_ddot_desired)
    ol.status("control", {{out}})

    return {{out}}
