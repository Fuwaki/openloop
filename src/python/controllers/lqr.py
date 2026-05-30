def controller({{args}}):
    q1 = ol.parameter("q1", 10.0, min=0.1, max=100.0, step=0.5)
    q2 = ol.parameter("q2", 1.0, min=0.1, max=100.0, step=0.5)
    r = ol.parameter("r", 0.1, min=0.01, max=10.0, step=0.01)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    Q = np.diag([q1, q2])   # 状态权重
    R = np.array([[r]])     # 控制权重
    K = np.array([q1, q2]) / max(r, 1e-6) ** 0.5

    # TODO: 将预设增益替换为由模型线性化得到的 LQR 增益
    err = np.array([q - target, q_dot])
    virtual_u = -K @ err
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
