def controller({{args}}):
    Kp = ol.parameter("Kp", 20.0, min=1.0, max=100.0, step=1.0)
    Kd = ol.parameter("Kd", 10.0, min=0.5, max=50.0, step=0.5)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    # 此模板为倒立摆专用的反馈线性化控制器。
    # 需要当前模型提供 theta, omega, x, v 等状态变量。
    # 通用模板见 feedback_linearization_ip.py。

    e = target - q
    e_dot_val = e_dot if 'e_dot' in globals() or 'e_dot' in locals() else 0.0

    # 线性化后的 PD 控制律
    v_desired = -Kp * e - Kd * e_dot_val

    # 反馈线性化：对输出 y = theta 求二阶导
    # y_dot = omega
    # y_ddot = (g/l)*sin(theta) - (1/l)*cos(theta)*a_cart
    # 解出 a_cart → F
    # 这里假设模型参数已知（通过 ol.parameter 或默认值）
    # 简化：直接用 v_desired 作为控制量，模型参数由平台处理
    {{out}} = input_gain_sign * v_desired
    ol.status("error", e)
    ol.status("v_desired", v_desired)
    ol.status("control", {{out}})

    return {{out}}
