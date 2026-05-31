def controller({{args}}):
    Kp = ol.parameter("Kp", 20.0, min=1.0, max=100.0, step=1.0)
    Kd = ol.parameter("Kd", 10.0, min=0.5, max=50.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # 倒立摆反馈线性化
    M = 0.5
    m = 0.2
    l = 0.3
    g = 9.81

    e = target - q
    e_dot_val = e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0

    # 线性化后的 PD 控制律: v_desired = Kp*e + Kd*e_dot
    # e = target - q, 所以 e > 0 时需要正的角加速度使 theta 增大
    v_desired = Kp * e + Kd * e_dot_val

    cos_th = np.cos(q)
    sin_th = np.sin(q)

    # 奇异保护: cos(theta) ≈ 0 时用非零小值替代
    cos_safe = cos_th if abs(cos_th) > 0.01 else 0.01 * (1.0 if cos_th >= 0 else -1.0)

    # 从 v_desired 反推 F
    x_ddot_desired = (g * sin_th / l - v_desired) * l / cos_safe
    F = (M + m) * x_ddot_desired + m * l * (-v_desired) * cos_th - m * l * q_dot ** 2 * sin_th

    {{out}} = F
    ol.status("error", e)
    ol.status("v_desired", v_desired)
    ol.status("x_ddot_desired", x_ddot_desired)
    ol.status("control", {{out}})

    return {{out}}
