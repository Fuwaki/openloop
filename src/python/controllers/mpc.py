def controller({{args}}):
    N = ol.parameter("N", 20, min=5, max=100, step=1)
    dt = ol.parameter("dt", 0.01, min=0.001, max=0.1, step=0.001)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # TODO: 在这里实现你的控制算法
    # 1. 构建预测模型
    # 2. 设置约束（状态/输入）
    # 3. 求解二次规划问题

    {{out}} = 0.0
    ol.status("error", target - q)
    ol.status("horizon", N)
    ol.status("control", {{out}})

    return {{out}}
