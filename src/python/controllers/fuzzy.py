# 5x5 模糊规则表 (NB/NS/ZO/PS/PB)
# 行: 误差 e (NB=-2, NS=-1, ZO=0, PS=1, PB=2)
# 列: 误差变化率 ec
# 值: 输出级别
RULE_TABLE = [
    [-2, -2, -2, -1,  0],   # e = NB
    [-2, -2, -1,  0,  1],   # e = NS
    [-2, -1,  0,  1,  2],   # e = ZO
    [-1,  0,  1,  2,  2],   # e = PS
    [ 0,  1,  2,  2,  2],   # e = PB
]

def trimf(x, a, b, c):
    """三角隶属度函数"""
    if x <= a or x >= c:
        return 0.0
    elif x <= b:
        return (x - a) / (b - a + 1e-9)
    else:
        return (c - x) / (c - b + 1e-9)

def fuzzify(x):
    """将标量模糊化为 5 个集合的隶属度"""
    return [
        trimf(x, -3, -2, -1),  # NB
        trimf(x, -2, -1,  0),  # NS
        trimf(x, -1,  0,  1),  # ZO
        trimf(x,  0,  1,  2),  # PS
        trimf(x,  1,  2,  3),  # PB
    ]

def controller({{args}}):
    Ke = ol.parameter("Ke", 3.0, min=0.1, max=20.0, step=0.1)
    Kec = ol.parameter("Kec", 1.0, min=0.1, max=10.0, step=0.1)
    Ku = ol.parameter("Ku", 5.0, min=0.1, max=20.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    e = target - q
    ec = e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0

    # 量化到 [-2, 2] 范围
    e_fuzzy = max(-2.0, min(2.0, Ke * e))
    ec_fuzzy = max(-2.0, min(2.0, Kec * ec))

    # 模糊化
    mu_e = fuzzify(e_fuzzy)
    mu_ec = fuzzify(ec_fuzzy)

    # Mamani 推理 + 重心解模糊
    num = 0.0
    den = 0.0
    for i in range(5):
        for j in range(5):
            w = mu_e[i] * mu_ec[j]
            if w > 0:
                num += w * RULE_TABLE[i][j]
                den += w

    if den > 0:
        output_level = num / den
    else:
        output_level = 0.0

    virtual_u = Ku * output_level
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", e)
    ol.status("error_rate", ec)
    ol.status("fuzzy_output_level", output_level)
    ol.status("virtual_u", virtual_u)
    ol.status("control", {{out}})

    return {{out}}
