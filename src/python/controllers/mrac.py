def controller({{args}}):
    am = 5.0     # 期望闭环极点
    theta = 1.0  # 自适应增益
    gamma = 1.0  # 自适应速率

    # TODO: 在这里实现你的控制算法
    ref = 0.0
    e = x - ref
    {{out}} = -theta * ref - gamma * e * x

    return {{out}}
