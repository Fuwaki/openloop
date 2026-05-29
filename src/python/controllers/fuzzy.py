def trimf(x, a, b, c):
    """三角隶属度函数"""
    return max(0, min((x - a) / (b - a + 1e-9), (c - x) / (c - b + 1e-9)))

def controller({{args}}):
    Ke = 3.0     # 误差缩放
    Kec = 1.0    # 误差变化率缩放
    Ku = 5.0     # 输出缩放

    # TODO: 在这里实现你的控制算法
    ref = 0.0
    e = ref - x
    ec = -v if v is not None else 0.0
    {{out}} = Ku * (Ke * e + Kec * ec)

    return {{out}}
