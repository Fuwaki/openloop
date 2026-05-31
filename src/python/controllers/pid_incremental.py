u_prev = 0.0
e_prev = 0.0
e_prev2 = 0.0
last_t = None

def controller({{args}}):
    global u_prev, e_prev, e_prev2, last_t

    Kp = ol.parameter("Kp", 10.0, min=0.0, max=100.0, step=0.1)
    Ki = ol.parameter("Ki", 1.0, min=0.0, max=50.0, step=0.1)
    Kd = ol.parameter("Kd", 2.0, min=0.0, max=20.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)
    last_t = t
    e = target - q

    # 增量式 PID：输出增量而非绝对值，天然抗积分饱和
    if dt > 1e-9:
        de = e - e_prev
        dde = e - 2 * e_prev + e_prev2
        delta_u = Kp * de + Ki * e * dt + Kd * dde / dt
    else:
        delta_u = 0.0
    u = u_prev + delta_u

    # 限幅防止数值爆炸
    u_max = 1000.0
    u = max(-u_max, min(u_max, u))

    e_prev2 = e_prev
    e_prev = e
    u_prev = u

    {{out}} = input_gain_sign * u
    ol.status("error", e)
    ol.status("delta_u", delta_u)
    ol.status("virtual_u", u)
    ol.status("control", {{out}})

    return {{out}}
