def controller({{args}}):
    gamma = ol.parameter("gamma", 2.0, min=0.5, max=20.0, step=0.5)
    q_weight = ol.parameter("q_weight", 10.0, min=0.1, max=100.0, step=0.5)
    r_weight = ol.parameter("r_weight", 1.0, min=0.1, max=50.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # H∞ 次优控制：基于混合灵敏度设计的简化实现
    # 对二阶系统，H∞ 问题等价于求解 Riccati 不等式
    # 简化：用 gamma 参数化增益，越大 → 越鲁棒但越保守
    dt_local = 0.001

    # 近似广义被控对象的权重
    # W1 (性能权重): 高增益 → 低频跟踪
    # W2 (控制权重): 限制带宽
    w1 = q_weight / max(gamma, 0.1)
    w2 = r_weight * gamma

    # 对二阶积分器模型求解简化 H∞ 增益
    # K_hinf ≈ sqrt(gamma * q_weight / r_weight) 的方向增益
    k1 = (q_weight ** 0.5) / max(gamma, 0.1) ** 0.5
    k2 = (r_weight ** 0.5) / max(gamma, 0.1) ** 0.5 * 0.5

    K = np.array([k1, k2])
    err = np.array([q - target, q_dot if 'q_dot' in globals() or 'q_dot' in locals() else 0.0])
    virtual_u = -float(K @ err)

    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("gamma_used", gamma)
    ol.status("gain_K0", k1)
    ol.status("gain_K1", k2)
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
