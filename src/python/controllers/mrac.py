def controller({{args}}):
    am = ol.parameter("am", 5.0, min=0.5, max=20.0, step=0.5)
    theta = ol.parameter("theta", 1.0, min=0.1, max=10.0, step=0.1)
    gamma = ol.parameter("gamma", 1.0, min=0.1, max=10.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # TODO: 添加自适应律的持久状态；这里保留最小可运行模板
    e = target - q
    virtual_u = -theta * ref + gamma * e * q
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("reference_pole", am)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
