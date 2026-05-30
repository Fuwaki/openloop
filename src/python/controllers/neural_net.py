INPUT_SIZE = 2
HIDDEN_SIZE = 8

np.random.seed(42)
W1 = np.random.randn(HIDDEN_SIZE, INPUT_SIZE) * 0.5
b1 = np.zeros(HIDDEN_SIZE)
W2 = np.random.randn(HIDDEN_SIZE) * 0.5
b2 = 0.0

def tanh(x):
    return np.tanh(x)

def controller({{args}}):
    # TODO: 在这里实现你的控制算法
    target = ol.parameter("target", ref, min=-1.0, max=1.0, step=0.01)
    gain = ol.parameter("gain", 1.0, min=0.1, max=20.0, step=0.1)

    inp = np.array([q - target, q_dot])
    h = tanh(W1 @ inp + b1)
    virtual_u = gain * (W2 @ h + b2)
    {{out}} = input_gain_sign * virtual_u
    ol.status("error", target - q)
    ol.status("virtual_u", float(virtual_u))
    ol.status("control", {{out}})

    return float({{out}})
