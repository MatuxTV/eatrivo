#!/usr/bin/env python3
"""
Feature Planning Tool — LangGraph Architect

Generuje štruktúrovaný feature plan pre LangGraph implementáciu.
Interaktívne sa pýta otázky a produkuje Markdown plánovací dokument.

Použitie:
    python scripts/plan_feature.py --name "My Feature" --output plan.md
    python scripts/plan_feature.py --interactive
"""

import argparse
import json
import os
from datetime import datetime

TEMPLATE = """# Feature Plan: {name}

**Vytvorené:** {date}
**Autor:** {author}
**Status:** Draft

---

## 1. Business požiadavka

### Popis
{description}

### Cieľový používateľ
{target_user}

### Akceptačné kritériá
{acceptance_criteria}

---

## 2. Technický scope

### Architektonický pattern
{pattern}

### Nové nody
{new_nodes}

### Modifikované nody
{modified_nodes}

### Nové state keys
```python
# Nové / modifikované state keys
{state_changes}
```

### Nové tools
{new_tools}

### Nové subgrafy
{new_subgraphs}

---

## 3. Graf topológia

```mermaid
{mermaid_diagram}
```

### Node detail tabuľka

| Node | Reads | Updates | Side Effects |
|------|-------|---------|-------------|
{node_table}

---

## 4. Conditional logic

### Edge conditions
{edge_conditions}

### Iteration guards
{iteration_guards}

---

## 5. Error handling

### Failure modes
{failure_modes}

### Recovery stratégia
{recovery_strategy}

---

## 6. Testing plan

### Unit testy
{unit_tests}

### Integration testy
{integration_tests}

### Edge case testy
{edge_case_tests}

---

## 7. Observabilita

### LangSmith konfigurácia
- Project: {langsmith_project}
- Tags: {langsmith_tags}
- Custom events: {custom_events}

### Metriky
{metrics}

### Alerting
{alerting}

---

## 8. Rollback plan
{rollback_plan}

---

## 9. Dependencies
{dependencies}

---

## 10. Estimated effort

| Fáza | Odhad |
|------|-------|
| State design | {effort_state} |
| Node implementation | {effort_nodes} |
| Edge logic | {effort_edges} |
| Testing | {effort_testing} |
| Integration | {effort_integration} |
| **Total** | **{effort_total}** |

---

## 11. Implementačné poznámky
{notes}

---

*Vygenerované LangGraph Architect — Antigravity*
"""

def create_plan(args):
    """Vytvorí feature plan z argumentov."""
    plan = TEMPLATE.format(
        name=args.get("name", "Unnamed Feature"),
        date=datetime.now().strftime("%Y-%m-%d"),
        author=args.get("author", os.getenv("USER", "Unknown")),
        description=args.get("description", "_TODO: Popíš feature_"),
        target_user=args.get("target_user", "_TODO: Kto bude feature používať?_"),
        acceptance_criteria=args.get("acceptance_criteria", "- [ ] _TODO: Definuj kritériá_"),
        pattern=args.get("pattern", "_TODO: Simple ReAct / Plan-and-Execute / Supervisor / ..._"),
        new_nodes=args.get("new_nodes", "- _TODO: Zoznam nových nodov_"),
        modified_nodes=args.get("modified_nodes", "- Žiadne"),
        state_changes=args.get("state_changes", "# TODO: Definuj state zmeny"),
        new_tools=args.get("new_tools", "- Žiadne"),
        new_subgraphs=args.get("new_subgraphs", "- Žiadne"),
        mermaid_diagram=args.get("mermaid_diagram",
            "graph TD\n    START --> node_1\n    node_1 --> END"),
        node_table=args.get("node_table",
            "| node_1 | messages | output | LLM call |"),
        edge_conditions=args.get("edge_conditions", "_TODO: Definuj podmienky_"),
        iteration_guards=args.get("iteration_guards", "- max_iterations: 10\n- timeout: 60s"),
        failure_modes=args.get("failure_modes",
            "- LLM timeout\n- Tool failure\n- Invalid input"),
        recovery_strategy=args.get("recovery_strategy",
            "- Retry s exponential backoff (max 3x)\n- Fallback na jednoduchšiu odpoveď\n- Error handler node"),
        unit_tests=args.get("unit_tests", "- [ ] Test node_1 s mock LLM\n- [ ] Test state updates"),
        integration_tests=args.get("integration_tests",
            "- [ ] Happy path end-to-end\n- [ ] Error recovery flow"),
        edge_case_tests=args.get("edge_case_tests",
            "- [ ] Prázdny vstup\n- [ ] Veľmi dlhý vstup\n- [ ] Concurrent requests"),
        langsmith_project=args.get("langsmith_project", "my-agent"),
        langsmith_tags=args.get("langsmith_tags", "feature-name, v1"),
        custom_events=args.get("custom_events", "progress, error, completion"),
        metrics=args.get("metrics",
            "- Latencia per node\n- Celková latencia\n- Error rate\n- Token usage"),
        alerting=args.get("alerting",
            "- Error rate > 5%\n- Latencia > 30s\n- Iteration count > 8"),
        rollback_plan=args.get("rollback_plan",
            "1. Revert git commit\n2. Redeploy predchádzajúcu verziu\n3. Notifikuj tím"),
        dependencies=args.get("dependencies", "- langgraph>=0.4\n- langchain-anthropic>=0.3"),
        effort_state=args.get("effort_state", "2h"),
        effort_nodes=args.get("effort_nodes", "4h"),
        effort_edges=args.get("effort_edges", "1h"),
        effort_testing=args.get("effort_testing", "3h"),
        effort_integration=args.get("effort_integration", "2h"),
        effort_total=args.get("effort_total", "12h"),
        notes=args.get("notes", "_Pridaj poznámky počas implementácie_"),
    )
    return plan


def main():
    parser = argparse.ArgumentParser(description="LangGraph Feature Planner")
    parser.add_argument("--name", "-n", default="New Feature", help="Feature name")
    parser.add_argument("--output", "-o", default=None, help="Output file path")
    parser.add_argument("--pattern", "-p", default=None,
                       choices=["react", "plan-execute", "supervisor", "hierarchical",
                                "swarm", "map-reduce", "reflection", "router"],
                       help="Architecture pattern")

    args = parser.parse_args()

    plan_args = {
        "name": args.name,
    }

    if args.pattern:
        pattern_descriptions = {
            "react": "Simple ReAct — jeden agent s tool calling",
            "plan-execute": "Plan-and-Execute — plánovanie pred exekúciou",
            "supervisor": "Supervisor — multi-agent s centrálnym riadením",
            "hierarchical": "Hierarchical — vnorené supervisory",
            "swarm": "Swarm/Handoff — dynamický handoff medzi agentmi",
            "map-reduce": "Map-Reduce — paralelné spracovanie + agregácia",
            "reflection": "Reflection — self-critique a iterácia",
            "router": "Router — klasifikácia a routing vstupov",
        }
        plan_args["pattern"] = pattern_descriptions.get(args.pattern, args.pattern)

    plan = create_plan(plan_args)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(plan)
        print(f"✅ Feature plan saved to: {args.output}")
    else:
        print(plan)


if __name__ == "__main__":
    main()
