def controller({{args}}):
    p1 = ol.parameter("p1", -5.0, min=-20.0, max=-0.1, step=0.5)
    p2 = ol.parameter("p2", -3.0, min=-20.0, max=-0.1, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # 极点配置：指定闭环极点位置，计算状态反馈增益 K
    # 对二阶系统 [q, q_dot]，闭环特征多项式: (s - p1)(s - p2) = s^2 + a1*s + a2
    a1 = -(p1 + p2)
    a2 = p1 * p2

    # 对标准二阶积分器模型 (A=[[0,1],[0,0]], B=[[0],[1]])
    # K = [a2, a1] (Ackermann 公式)
    K = np.array([a2, a1])

    err = np.array([q - target, q_dot if 'q_dot' in globals() or 'q_dot' in locals() else 0.0])
    virtual_u = -float(K @ err)
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("gain_K0", float(K[0]))
    ol.status("gain_K1", float(K[1]))
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
