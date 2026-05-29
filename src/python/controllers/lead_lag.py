def controller({{args}}):
    K = 1.0    # 增益
    z = 1.0    # 零点
    p = 10.0   # 极点

    # TODO: 在这里实现你的控制算法
    ref = 0.0
    error = ref - x
    {{out}} = K * error

    return {{out}}
