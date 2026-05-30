def controller({{args}}):
    c1 = ol.parameter("c1", 5.0, min=0.5, max=20.0, step=0.5)
    c2 = ol.parameter("c2", 3.0, min=0.5, max=20.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # TODO: 根据具体模型补充严格反馈形式中的非线性补偿项
    e = target - q
    alpha1 = c1 * e
    virtual_u = -c2 * (q_dot - alpha1) - (q - target)
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("alpha1", alpha1)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
