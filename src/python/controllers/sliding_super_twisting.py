st_u = 0.0
st_w = 0.0
last_t = None

def controller({{args}}):
    global st_u, st_w, last_t

    lam = ol.parameter("lambda", 5.0, min=0.5, max=30.0, step=0.5)
    alpha = ol.parameter("alpha", 10.0, min=1.0, max=50.0, step=1.0)
    c = ol.parameter("c", 5.0, min=0.5, max=20.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)

    # 仿真时间回绕（新仿真）时重置状态
    if dt < 0:
        st_u = 0.0
        st_w = 0.0
        dt = 0.0
    last_t = t

    e = target - q
    s = c * e + (e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0)

    # 超螺旋算法: 连续控制，二阶滑模，无抖振
    st_u += dt * (-lam * (abs(s) ** 0.5) * np.sign(s) + st_w)
    st_w += dt * (-alpha * np.sign(s))

    # 防止 windup
    w_max = 100.0
    st_w = max(-w_max, min(w_max, st_w))
    u_max = 500.0
    st_u = max(-u_max, min(u_max, st_u))

    {{out}} = input_gain_sign * st_u
    ol.status("error", e)
    ol.status("sliding_surface", s)
    ol.status("super_twisting_u", st_u)
    ol.status("super_twisting_w", st_w)
    ol.status("control", {{out}})

    return {{out}}
