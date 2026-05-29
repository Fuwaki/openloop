def controller({{args}}):
    c1 = 5.0
    c2 = 3.0

    # TODO: 在这里实现你的控制算法
    ref = 0.0
    alpha1 = -c1 * (x1 - ref)
    {{out}} = -c2 * (x2 - alpha1) - (x1 - ref)

    return {{out}}
