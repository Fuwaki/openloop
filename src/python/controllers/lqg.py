def controller({{args}}):
    L = np.array([1.0, 0.5])   # 卡尔曼增益
    K = np.array([10.0, 5.0])   # LQR 增益

    # TODO: 在这里实现你的控制算法
    ref = 0.0
    x_hat = np.array([x, v])
    {{out}} = -K @ (x_hat - ref)

    return float({{out}})
