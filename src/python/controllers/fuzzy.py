def trimf(x, a, b, c):
    """三角隶属度函数"""
    return max(0, min((x - a) / (b - a + 1e-9), (c - x) / (c - b + 1e-9)))

def controller({{args}}):
    Ke = ol.parameter("Ke", 3.0, min=0.1, max=20.0, step=0.1)
    Kec = ol.parameter("Kec", 1.0, min=0.1, max=10.0, step=0.1)
    Ku = ol.parameter("Ku", 5.0, min=0.1, max=20.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # TODO: 将线性组合替换为完整模糊规则表
    e = target - q
    ec = e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0
    virtual_u = Ku * (Ke * e + Kec * ec)
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("error_rate", ec)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
