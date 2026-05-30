def controller({{args}}):
    # TODO: 在这里实现你的控制算法
    # 需要根据具体系统模型设计反馈线性化控制律
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)
    {{out}} = 0.0
    ol.status("error", target - q)
    ol.status("control", {{out}})

    return {{out}}
