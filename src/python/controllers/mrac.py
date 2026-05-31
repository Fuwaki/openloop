mrac_theta = 1.0
x_m = 0.0
last_t = None

def controller({{args}}):
    global mrac_theta, x_m, last_t

    am = ol.parameter("am", 5.0, min=0.5, max=20.0, step=0.5)
    gamma_rate = ol.parameter("gamma", 2.0, min=0.1, max=20.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt = 0.0 if last_t is None else max(0.0, t - last_t)
    last_t = t

    # 参考模型: dx_m/dt = -am * x_m + am * ref
    x_m += dt * (-am * x_m + am * target)

    e = q - x_m  # 跟踪误差（被控量 vs 参考模型输出）

    # 自适应律（Lyapunov-based）: d(mrac_theta)/dt = -gamma * e * q
    mrac_theta += dt * (-gamma_rate * e * q)

    # 控制律: u = mrac_theta * ref - am * e
    virtual_u = mrac_theta * target - am * e
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("reference_model", x_m)
    ol.status("adaptive_gain", mrac_theta)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
