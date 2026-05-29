"""OpenLoop 代码静态分析器

使用 Python ast 模块对用户代码进行静态分析：
1. 语法错误检测
2. ol.parameter() / ol.status() 调用识别
3. controller 函数定义检测及其参数提取

不依赖第三方模块，仅使用 ast 标准库。
"""

import ast


def check_syntax(code):
    """检查 Python 代码语法错误。

    Args:
        code: Python 源代码字符串

    Returns:
        dict: {"ok": True} 或 {"ok": False, "errors": [{"line": int, "col": int, "message": str}]}
    """
    try:
        ast.parse(code)
        return {"ok": True}
    except SyntaxError as e:
        return {
            "ok": False,
            "errors": [
                {
                    "line": e.lineno or 1,
                    "col": e.offset or 0,
                    "message": e.msg or "syntax error",
                }
            ],
        }


def _extract_literal(node):
    """从 AST 节点提取字面值。

    支持: 常量 (int/float/str/bool/None)、一元运算 (+/-)、元组/列表。
    非字面值返回 None。
    """
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        val = _extract_literal(node.operand)
        if val is not None:
            return +val if isinstance(node.op, ast.UAdd) else -val
    if isinstance(node, (ast.Tuple, ast.List)):
        items = []
        for elt in node.elts:
            v = _extract_literal(elt)
            if v is None:
                return None
            items.append(v)
        return items
    return None


def detect_ol_calls(code):
    """检测 openloop 模块的 parameter() 和 status() 调用。

    支持以下导入方式：
      import openloop              → openloop.parameter() / openloop.status()
      import openloop as ol        → ol.parameter() / ol.status()
      from openloop import parameter, status  → parameter() / status()
      from openloop import parameter as p     → p()  (name 记为 "openloop.parameter")

    Args:
        code: Python 源代码字符串

    Returns:
        dict: {"calls": [{"name": str, "args": list, "line": int, "col": int, "end_col": int}]}
    """
    result = {"calls": []}

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return result

    # --- 第一遍：收集 openloop 相关的 import ---

    # dotted_callers: {"ol": {"parameter", "status"}} → ol.parameter()
    dotted_callers = {}
    # bare_callers: {"parameter": "openloop.parameter"} → parameter()
    bare_callers = {}

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "openloop":
                    name = alias.asname or "openloop"
                    dotted_callers[name] = {"parameter", "status"}

        elif isinstance(node, ast.ImportFrom) and node.module == "openloop":
            for alias in node.names:
                if alias.name in ("parameter", "status"):
                    local_name = alias.asname or alias.name
                    bare_callers[local_name] = f"openloop.{alias.name}"

    if not dotted_callers and not bare_callers:
        return result

    # --- 第二遍：匹配调用 ---

    def add_call(display_name, call_node):
        args = [_extract_literal(arg) for arg in call_node.args]
        kwargs = {}
        for kwarg in call_node.keywords:
            val = _extract_literal(kwarg.value)
            if val is not None and kwarg.arg:
                kwargs[kwarg.arg] = val
        col = call_node.col_offset
        end_col = getattr(call_node, "end_col_offset", col + 1) or col + 1
        result["calls"].append({
            "name": display_name,
            "args": args,
            "kwargs": kwargs,
            "line": call_node.lineno,
            "col": col,
            "end_col": end_col,
        })

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        fn = node.func

        # 形式: alias.parameter() / alias.status()
        if isinstance(fn, ast.Attribute) and isinstance(fn.value, ast.Name):
            module_name = fn.value.id
            if module_name in dotted_callers and fn.attr in dotted_callers[module_name]:
                add_call(f"openloop.{fn.attr}", node)

        # 形式: parameter() / status() (bare call)
        elif isinstance(fn, ast.Name) and fn.id in bare_callers:
            add_call(bare_callers[fn.id], node)

    return result


def detect_controller(code):
    """检测 controller 函数定义并提取参数名。

    Args:
        code: Python 源代码字符串

    Returns:
        dict: {"found": bool, "params": [str, ...], "line": int}
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return {"found": False, "params": [], "line": 0}

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "controller":
            params = []
            for arg in node.args.args:
                params.append(arg.arg)
            return {"found": True, "params": params, "line": node.lineno}

    return {"found": False, "params": [], "line": 0}
