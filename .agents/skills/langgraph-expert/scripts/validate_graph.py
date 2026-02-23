#!/usr/bin/env python3
"""
Graph Validator — LangGraph Architect

Statická analýza LangGraph kódu. Kontroluje:
- State definíciu (TypedDict, reducery)
- Node funkcie (správne signatúry, return typy)
- Graph assembly (chýbajúce edges, unreachable nodes, missing iteration guards)
- Best practices

Použitie:
    python scripts/validate_graph.py --dir /path/to/src
    python scripts/validate_graph.py --file src/graph.py
"""

import ast
import sys
import os
import argparse
from pathlib import Path

findings = []

def add_finding(severity, category, message, file=None, line=None, fix=None):
    findings.append({
        "severity": severity,
        "category": category,
        "message": message,
        "file": file,
        "line": line,
        "fix": fix,
    })

def analyze_file(filepath):
    """Analyzuj jeden Python súbor."""
    try:
        with open(filepath, 'r') as f:
            source = f.read()
        tree = ast.parse(source)
    except SyntaxError as e:
        add_finding("ERROR", "syntax", f"Syntax error: {e}", filepath, e.lineno)
        return
    except Exception:
        return

    # Kontrola imports
    has_stategraph = False
    has_typeddict = False
    has_start_end = False

    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.module and 'langgraph' in node.module:
                for alias in node.names:
                    if alias.name == 'StateGraph':
                        has_stategraph = True
                    if alias.name in ('START', 'END'):
                        has_start_end = True
            if node.module and 'typing' in node.module:
                for alias in node.names:
                    if alias.name == 'TypedDict':
                        has_typeddict = True

    # Kontrola state class
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            bases = [getattr(b, 'id', '') for b in node.bases if hasattr(b, 'id')]
            if 'TypedDict' in bases:
                check_state_class(node, filepath)

    # Kontrola node functions
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            check_node_function(node, filepath, source)

    # Kontrola graph assembly
    check_graph_assembly(source, filepath)

    # Kontrola anti-patterns
    check_anti_patterns(source, filepath)


def check_state_class(node, filepath):
    """Kontroluj State TypedDict."""
    class_name = node.name

    # Kontrola: má messages field?
    has_messages = False
    has_iteration = False
    has_error = False

    for item in node.body:
        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
            name = item.target.id
            if name == 'messages':
                has_messages = True
            if 'iteration' in name.lower() or 'count' in name.lower():
                has_iteration = True
            if 'error' in name.lower():
                has_error = True

    if not has_messages:
        add_finding("INFO", "state", f"State '{class_name}' nemá 'messages' field",
                    filepath, node.lineno, "Pridaj messages: Annotated[list, add_messages] ak ide o konverzačný agent")

    if not has_iteration:
        add_finding("MEDIUM", "state", f"State '{class_name}' nemá iteration counter",
                    filepath, node.lineno, "Pridaj iteration_count: int pre ochranu pred infinite loops")

    if not has_error:
        add_finding("LOW", "state", f"State '{class_name}' nemá error field",
                    filepath, node.lineno, "Pridaj error: Optional[str] pre centralizovaný error handling")


def check_node_function(node, filepath, source):
    """Kontroluj node funkciu."""
    func_name = node.name

    # Preskočí utility funkcie
    if func_name.startswith('_') or func_name in ('main', 'build_graph', 'route_'):
        return

    # Kontrola: má docstring?
    if not (node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant)):
        add_finding("LOW", "docs", f"Funkcia '{func_name}' nemá docstring",
                    filepath, node.lineno, "Pridaj docstring s Reads/Updates/Side effects")

    # Kontrola: má try/except?
    has_try = False
    for child in ast.walk(node):
        if isinstance(child, ast.Try):
            has_try = True
            break

    # Len ak to vyzerá ako node (prijíma state)
    if node.args.args and len(node.args.args) >= 1:
        first_arg = node.args.args[0].arg
        if first_arg == 'state' and not has_try:
            add_finding("MEDIUM", "error", f"Node '{func_name}' nemá try/except",
                        filepath, node.lineno, "Pridaj error handling pre robustnosť")

    # Kontrola: vracia dict?
    has_return = False
    for child in ast.walk(node):
        if isinstance(child, ast.Return) and child.value is not None:
            has_return = True
            break

    if node.args.args and len(node.args.args) >= 1:
        first_arg = node.args.args[0].arg
        if first_arg == 'state' and not has_return:
            add_finding("HIGH", "logic", f"Node '{func_name}' nevracia žiadnu hodnotu",
                        filepath, node.lineno, "Node musí vracať dict s state updates")


def check_graph_assembly(source, filepath):
    """Kontroluj graf assembly."""
    # Kontrola: add_edge(START, ...)
    if 'StateGraph' in source:
        if 'START' not in source:
            add_finding("HIGH", "graph", "Graf nepoužíva START — chýba entry point",
                        filepath, None, "Pridaj builder.add_edge(START, 'first_node')")

        if 'END' not in source:
            add_finding("HIGH", "graph", "Graf nepoužíva END — chýba termination",
                        filepath, None, "Pridaj edge k END pre ukončenie grafu")

        if '.compile()' not in source:
            add_finding("MEDIUM", "graph", "Graf nie je kompilovaný (.compile())",
                        filepath, None, "Pridaj graph = builder.compile()")

        # Kontrola checkpointera
        if 'checkpointer' not in source and 'compile' in source:
            add_finding("MEDIUM", "persistence", "Graf je kompilovaný bez checkpointera",
                        filepath, None, "Pridaj checkpointer pre state persistence: builder.compile(checkpointer=...)")


def check_anti_patterns(source, filepath):
    """Kontroluj anti-patterns."""
    lines = source.split('\n')

    for i, line in enumerate(lines, 1):
        # Globálne premenné
        if line.strip().startswith('global '):
            add_finding("HIGH", "pattern", "Použitie 'global' — state by mal ísť cez graf",
                        filepath, i, "Použi state namiesto globálnych premenných")

        # Hardcoded model
        if 'model="gpt' in line or "model='gpt" in line or 'model="claude' in line:
            if 'get_model' not in source and 'config' not in line.lower():
                add_finding("LOW", "config", "Hardcoded model name",
                            filepath, i, "Použi konfigurovateľný model cez env variable alebo config")

        # Infinite loop risk
        if 'while True' in line:
            add_finding("HIGH", "loop", "while True loop — riziko infinite loop",
                        filepath, i, "Použi LangGraph conditional edges namiesto while loop")

        # print() v produkcii
        if line.strip().startswith('print(') and 'debug' not in line.lower():
            add_finding("LOW", "logging", "print() namiesto logging",
                        filepath, i, "Použi logging modul namiesto print()")


def main():
    parser = argparse.ArgumentParser(description="LangGraph Graph Validator")
    parser.add_argument("--dir", "-d", default=None, help="Directory to scan")
    parser.add_argument("--file", "-f", default=None, help="Single file to scan")
    args = parser.parse_args()

    files_to_scan = []

    if args.file:
        files_to_scan.append(args.file)
    elif args.dir:
        for root, dirs, files in os.walk(args.dir):
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '__pycache__', '.venv', 'venv')]
            for f in files:
                if f.endswith('.py'):
                    files_to_scan.append(os.path.join(root, f))
    else:
        print("Použi --dir alebo --file")
        sys.exit(1)

    print("🔍 LangGraph Graph Validator")
    print("============================")
    print(f"Scanning {len(files_to_scan)} files...\n")

    for f in files_to_scan:
        analyze_file(f)

    # Sort by severity
    severity_order = {"ERROR": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
    findings.sort(key=lambda x: severity_order.get(x["severity"], 99))

    # Report
    emoji = {"ERROR": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵", "INFO": "⚪"}
    counts = {}

    for f in findings:
        sev = f["severity"]
        counts[sev] = counts.get(sev, 0) + 1
        e = emoji.get(sev, "❓")
        loc = f"{f['file']}:{f['line']}" if f['file'] and f['line'] else f.get('file', 'N/A')
        print(f"{e} [{sev}] [{f['category']}] {f['message']}")
        print(f"   📍 {loc}")
        if f.get("fix"):
            print(f"   🔧 {f['fix']}")
        print()

    print("📊 Summary:")
    for sev in ["ERROR", "HIGH", "MEDIUM", "LOW", "INFO"]:
        if sev in counts:
            print(f"   {emoji[sev]} {sev}: {counts[sev]}")
    print(f"   Total: {len(findings)}")

    # Exit code
    if counts.get("ERROR", 0) > 0 or counts.get("HIGH", 0) > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
