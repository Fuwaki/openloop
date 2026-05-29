def controller({{args}}):
    c = 5.0     # 滑模面斜率
    eta = 2.0   # 切换增益

    ref = 0.0
    error = ref - x
    s = c * error + (-v)  # 滑模面
    {{out}} = -eta * np.sign(s)

    return {{out}}
