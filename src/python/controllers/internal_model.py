im_state = 0.0
last_t = None

def controller({{args}}):
    global im_state, last_t

    tau_f = ol.parameter("tau_f", 0.1, min=0.01, max=2.0, step=0.01)
    gain = ol.parameter("gain", 5.0, min=0.1, max=50.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)
    last_t = t

    e = target - q

    # 内模控制 (IMC):
    # Q(s) = G_inv(s) * F(s), 其中 F(s) = 1/(tau_f*s + 1) 为低通滤波器
    # 对一阶系统 G(s) = K/(tau*s+1), G_inv = (tau*s+1)/K
    # Q(s) = (tau*s+1) / (K * (tau_f*s + 1))
    # 离散实现：一阶滤波器 + 比例
    # 简化为: u = gain * e / (tau_f * s + 1) 的状态空间实现
    im_state += dt * (-im_state / tau_f + e / tau_f)
    virtual_u = gain * im_state
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("im_state", im_state)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
