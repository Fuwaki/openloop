integral = 0.0
last_t = None
last_target = None

def controller({{args}}):
    global integral, last_t, last_target

    Kp = ol.parameter("Kp", 10.0, min=0.0, max=100.0, step=0.1)
    Ki = ol.parameter("Ki", 1.0, min=0.0, max=50.0, step=0.1)
    Kd = ol.parameter("Kd", 2.0, min=0.0, max=20.0, step=0.1)
    beta = ol.parameter("beta", 0.5, min=0.0, max=1.0, step=0.05)
    gamma_param = ol.parameter("gamma", 0.1, min=0.0, max=1.0, step=0.05)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)
    last_t = t

    # 二自由度 PID:
    # P 项: Kp * (beta * ref - q)  — 只有部分设定值参与比例项
    # I 项: Ki * integral(e)  — 完整误差保证无静差
    # D 项: Kd * (gamma * ref_dot - q_dot)  — 设定值微分加权
    e = target - q
    integral += e * dt

    # 估算设定值变化率
    if last_target is not None and dt > 0:
        target_dot = (target - last_target) / dt
    else:
        target_dot = 0.0
    last_target = target

    q_dot_val = q_dot if 'q_dot' in globals() or 'q_dot' in locals() else 0.0

    p_term = Kp * (beta * target - q)
    i_term = Ki * integral
    d_term = Kd * (gamma_param * target_dot - q_dot_val)

    virtual_u = p_term + i_term + d_term
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("integral", integral)
    ol.status("p_term", p_term)
    ol.status("d_term", d_term)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
