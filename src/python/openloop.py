"""OpenLoop 运行时模块

在 Pyodide 中注册为 'openloop'，提供：
  - parameter(name, default, *, min, max, step) → 注册并返回用户可调参数
  - status(name, value) → 将变量发送到检查器/图表

用户通过 import openloop 或 import openloop as ol 使用。
"""

_params = {}   # {name: value} — 运行时值，TS 侧通过 _set_params 注入
_status = {}   # {name: value} — 运行时状态值


def parameter(name, default, *, min=None, max=None, step=None):
    """注册并返回一个用户可调参数。

    Args:
        name: 参数名（字符串）
        default: 默认值（数值）
        min: 最小值（可选，给 PanelParams 用）
        max: 最大值（可选，给 PanelParams 用）
        step: 步长（可选，给 PanelParams 用）

    Returns:
        当前参数值（首次调用返回 default，之后返回滑块值）
    """
    if name not in _params:
        _params[name] = default
    return _params[name]


def status(name, value):
    """将一个变量发送到检查器/图表。

    Args:
        name: 变量名（字符串）
        value: 当前值
    """
    _status[name] = value


# ── 辅助函数（TS 侧调用） ──

def _get_params():
    """获取所有参数当前值。"""
    return dict(_params)


def _set_params(d):
    """批量设置参数值（TS 侧从滑块注入）。"""
    _params.update(d)


def _get_status():
    """获取所有状态值。"""
    return dict(_status)


def _clear():
    """清空参数和状态（仿真开始/停止时调用）。"""
    _params.clear()
    _status.clear()
