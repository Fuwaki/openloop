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
    ref = 0.0
    inp = np.array([x, v])
    inp[0] -= ref
    h = tanh(W1 @ inp + b1)
    {{out}} = W2 @ h + b2

    return float({{out}})
