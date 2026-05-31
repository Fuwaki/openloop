q_prev = 0.0
u_prev = 0.0
last_t = None

def controller({{args}}):
    global q_prev, u_prev, last_t

    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.001 if last_t is None else max(0.0001, t - last_t)
    last_t = t

    # Deadbeat 控制：在有限拍内使输出精确到达参考值
    # 对一阶系统: x(k+1) = a*x(k) + b*u(k)
    # 令 x(k+1) = ref → u(k) = (ref - a*x(k)) / b
    # 对二阶系统: 两步预测
    # 近似: a ≈ 1, b ≈ dt (归一化二阶积分器)
    a_approx = 1.0
    b_approx = dt

    # 一阶 deadbeat
    if b_approx > 1e-9:
        u_desired = (target - a_approx * q) / b_approx
    else:
        u_desired = 0.0

    # 限幅防止过大的控制量
    u_max = 100.0
    u_desired = max(-u_max, min(u_max, u_desired))

    q_prev = q
    u_prev = u_desired

    {{out}} = input_gain_sign * u_desired
    ol.status("error", target - q)
    ol.status("virtual_u", u_desired)
    ol.status("control", {{out}})

    return {{out}}
