x_hat = np.array([0.0, 0.0])
P_kf = np.eye(2) * 10.0
last_u = 0.0
last_t = None

def controller({{args}}):
    global x_hat, P_kf, last_u, last_t

    q1 = ol.parameter("q1", 10.0, min=0.1, max=100.0, step=0.5)
    r = ol.parameter("r", 0.1, min=0.01, max=10.0, step=0.01)
    L1 = ol.parameter("L1", 1.0, min=0.1, max=10.0, step=0.1)
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)

    dt_local = 0.001
    if last_t is not None:
        dt_local = max(0.0001, t - last_t)
    last_t = t

    # ── LQR gain (closed-form for double integrator) ──
    r_eff = max(r, 1e-6)
    k0 = np.sqrt(q1 / r_eff)
    k1 = np.sqrt(2.0 * k0 + 1.0 / r_eff)
    K = np.array([k0, k1])

    # ── 离散 Kalman 滤波器 ──
    A = np.array([[1.0, dt_local], [0.0, 1.0]])
    B = np.array([[0.0], [dt_local]])
    u_vec = np.array([last_u])

    # 预测
    x_hat_pred = A @ x_hat + B @ u_vec
    Qw = np.eye(2) * 0.01
    Rv = np.array([[max(L1, 0.01)]])
    P_pred = A @ P_kf @ A.T + Qw

    # 更新 (Joseph form for numerical robustness)
    H = np.array([[1.0, 0.0]])
    S = H @ P_pred @ H.T + Rv
    K_kf = (P_pred @ H.T) / S[0, 0]
    y_meas = q - target
    innovation = y_meas - (H @ x_hat_pred)[0]
    x_hat = x_hat_pred.flatten() + K_kf.flatten() * innovation

    I_KH = np.eye(2) - K_kf @ H
    P_kf = I_KH @ P_pred @ I_KH.T + K_kf @ Rv @ K_kf.T
    P_kf = (P_kf + P_kf.T) / 2.0  # symmetrize

    # ── LQG control = LQR with estimated state ──
    virtual_u = -float(K @ x_hat)
    last_u = virtual_u

    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("x_hat_0", float(x_hat[0]))
    ol.status("x_hat_1", float(x_hat[1]))
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
