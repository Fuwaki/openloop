def controller({{args}}):
    L1 = ol.parameter("L1", 1.0, min=0.1, max=10.0, step=0.1)
    q1 = ol.parameter("q1", 10.0, min=0.1, max=100.0, step=0.5)
    r = ol.parameter("r", 0.1, min=0.01, max=10.0, step=0.01)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    L = np.array([L1, 0.5 * L1])   # 卡尔曼增益
    K = np.array([q1, max(1.0, q1 ** 0.5)]) / max(r, 1e-6) ** 0.5

    # TODO: 添加观测器更新；这里先用目标链状态作为估计值
    x_hat = np.array([q - target, q_dot])
    virtual_u = -K @ x_hat
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("observer_gain", float(L[0]))
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
