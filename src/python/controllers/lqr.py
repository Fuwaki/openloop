def controller({{args}}):
    Q = np.diag([10.0, 1.0])   # 状态权重
    R = np.array([[0.1]])       # 控制权重

    K = np.array([10.0, 5.0])   # 预设增益

    # TODO: 在这里实现你的控制算法
    ref = 0.0
    err = np.array([x, v]) - ref
    {{out}} = -K @ err

    return float({{out}})
