def controller({{args}}):
    K = np.array([1.0, 1.0])   # 预设增益

    ref = 0.0
    err = np.array([x, v]) - ref
    {{out}} = -K @ err

    return float({{out}})
