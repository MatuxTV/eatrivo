# Testing Patterns — LangGraph

## Table of Contents
1. Unit Testing Nodes
2. Integration Testing Graphs
3. Edge Case Testing
4. Mocking LLM calls
5. LangSmith Evaluation
6. CI/CD Integration

---

## 1. Unit Testing Nodes

Každý node je funkcia: state in → dict out. Jednoducho testovateľné.

```python
# tests/test_nodes.py
import pytest
from src.nodes.router import router_node
from src.state import AgentState
from langchain_core.messages import HumanMessage

def test_router_routes_simple_query():
    """Router by mal klasifikovať jednoduché otázky ako 'simple'."""
    state: AgentState = {
        "messages": [HumanMessage(content="What is 2+2?")],
        "current_step": "",
        "next_action": None,
        "iteration_count": 0,
        "error": None,
        "retry_count": 0,
    }

    result = router_node(state)

    assert "next_action" in result
    assert result["next_action"] == "simple"

def test_router_routes_complex_query():
    """Router by mal klasifikovať výskumné otázky ako 'complex'."""
    state: AgentState = {
        "messages": [HumanMessage(content="Research the latest trends in quantum computing and write a report")],
        "current_step": "",
        "next_action": None,
        "iteration_count": 0,
        "error": None,
        "retry_count": 0,
    }

    result = router_node(state)
    assert result["next_action"] == "complex"
```

### Testovanie state updates

```python
def test_node_returns_correct_state_keys():
    """Node musí vracať len validné state keys."""
    valid_keys = set(AgentState.__annotations__.keys())

    result = my_node(sample_state)

    for key in result.keys():
        assert key in valid_keys, f"Node returned unknown key: {key}"

def test_node_increments_iteration():
    """Node musí inkrementovať iteration_count."""
    state = {**sample_state, "iteration_count": 5}
    result = my_node(state)

    # Ak node je v loop, mal by inkrementovať
    assert result.get("iteration_count", 5) >= 5
```

---

## 2. Integration Testing Graphs

```python
# tests/test_graph.py
import pytest
from src.graph import build_graph
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.checkpoint.memory import InMemorySaver

@pytest.fixture
def graph():
    """Fresh graph pre každý test."""
    return build_graph(checkpointer=InMemorySaver())

@pytest.fixture
def config():
    return {"configurable": {"thread_id": "test-thread"}}

def test_simple_query_flow(graph, config):
    """Jednoduchá otázka by mala prejsť router → formatter → END."""
    result = graph.invoke(
        {"messages": [HumanMessage(content="Hello, how are you?")]},
        config
    )

    assert len(result["messages"]) > 1
    assert isinstance(result["messages"][-1], AIMessage)
    assert result.get("error") is None

def test_complex_query_flow(graph, config):
    """Komplexná otázka by mala prejsť planner → executor → evaluator."""
    result = graph.invoke(
        {"messages": [HumanMessage(content="Analyze the market trends for EV industry")]},
        config
    )

    assert result.get("plan") is not None
    assert len(result.get("step_results", [])) > 0
    assert result.get("final_answer") is not None

def test_conversation_memory(graph, config):
    """Graf si musí pamätať kontext medzi správami."""
    # Prvá správa
    graph.invoke(
        {"messages": [HumanMessage(content="My favorite color is blue")]},
        config
    )

    # Druhá správa
    result = graph.invoke(
        {"messages": [HumanMessage(content="What's my favorite color?")]},
        config
    )

    last_message = result["messages"][-1].content.lower()
    assert "blue" in last_message
```

### Testovanie graph topológie

```python
def test_graph_has_required_nodes(graph):
    """Graf musí obsahovať všetky požadované nody."""
    node_names = set(graph.get_graph().nodes.keys())
    required = {"router", "planner", "executor", "evaluator", "formatter", "error_handler"}
    assert required.issubset(node_names)

def test_graph_visualization(graph):
    """Graf by sa mal dať vizualizovať."""
    mermaid = graph.get_graph().draw_mermaid()
    assert "router" in mermaid
    assert "planner" in mermaid
```

---

## 3. Edge Case Testing

```python
def test_empty_input(graph, config):
    """Prázdny vstup by nemal crashnúť."""
    result = graph.invoke(
        {"messages": [HumanMessage(content="")]},
        config
    )
    assert result is not None

def test_very_long_input(graph, config):
    """Veľmi dlhý vstup by mal byť spracovaný."""
    long_input = "a" * 10000
    result = graph.invoke(
        {"messages": [HumanMessage(content=long_input)]},
        config
    )
    assert result.get("error") is None or "too long" in str(result.get("error", "")).lower()

def test_max_iterations_guard(graph, config):
    """Graf nesmie bežať donekonečna."""
    # Zadaj úlohu, ktorá môže spôsobiť loop
    result = graph.invoke(
        {"messages": [HumanMessage(content="Keep improving this until it's absolutely perfect: Hello world")]},
        config
    )
    # Musí skončiť — ak nie, test timeoutne
    assert result is not None
    assert result.get("iteration_count", 0) <= 15  # Max iterations

def test_tool_failure_recovery(graph, config):
    """Graf by mal prežiť zlyhanie tool callu."""
    # Simuluj request, ktorý triggrne tool s nevalidným vstupom
    result = graph.invoke(
        {"messages": [HumanMessage(content="Search for @#$%^&* in the database")]},
        config
    )
    assert result is not None
    # Buď sa zotaví alebo vráti chybovú správu
```

---

## 4. Mocking LLM calls

```python
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage

@pytest.fixture
def mock_llm():
    """Mock LLM, ktorý vracia predefinované odpovede."""
    mock = MagicMock()
    mock.invoke.return_value = AIMessage(content='{"next": "researcher"}')
    return mock

def test_supervisor_routing_with_mock(mock_llm):
    """Test supervisor routing bez skutočného LLM callu."""
    with patch("src.nodes.supervisor.model", mock_llm):
        from src.nodes.supervisor import supervisor_node

        state = {
            "messages": [HumanMessage(content="Research AI trends")],
            "next": "",
        }

        result = supervisor_node(state)
        assert result["next"] == "researcher"

# Pre deterministické testy:
class FakeLLM:
    """Deterministický fake LLM pre testy."""
    def __init__(self, responses: list[str]):
        self.responses = iter(responses)

    def invoke(self, messages, **kwargs):
        return AIMessage(content=next(self.responses))

    def bind_tools(self, tools):
        return self  # Pre tool-calling testy
```

---

## 5. LangSmith Evaluation

```python
# evals/run_eval.py
from langsmith import Client
from langsmith.evaluation import evaluate

client = Client()

# Definuj dataset
dataset = client.create_dataset("agent-eval-v1")
client.create_examples(
    inputs=[
        {"messages": [{"role": "user", "content": "What is 2+2?"}]},
        {"messages": [{"role": "user", "content": "Research quantum computing"}]},
    ],
    outputs=[
        {"expected": "4"},
        {"expected_contains": ["quantum", "computing", "qubits"]},
    ],
    dataset_id=dataset.id,
)

# Definuj evaluátory
def correctness_evaluator(run, example):
    """Kontroluje či output obsahuje expected answer."""
    output = run.outputs.get("messages", [])[-1].content
    expected = example.outputs.get("expected", "")

    if expected:
        return {"score": 1 if expected.lower() in output.lower() else 0}

    keywords = example.outputs.get("expected_contains", [])
    if keywords:
        found = sum(1 for k in keywords if k.lower() in output.lower())
        return {"score": found / len(keywords)}

    return {"score": 0}

# Spusti eval
results = evaluate(
    graph.invoke,
    data=dataset.name,
    evaluators=[correctness_evaluator],
    experiment_prefix="agent-v1",
)
```

---

## 6. CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Agent Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install ".[dev]"

      - name: Run unit tests
        run: pytest tests/test_nodes.py -v

      - name: Run integration tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LANGSMITH_API_KEY: ${{ secrets.LANGSMITH_API_KEY }}
        run: pytest tests/test_graph.py -v --timeout=60

      - name: Run evals (on main only)
        if: github.ref == 'refs/heads/main'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LANGSMITH_API_KEY: ${{ secrets.LANGSMITH_API_KEY }}
        run: python evals/run_eval.py
```

### Pytest konfigurácia

```ini
# pytest.ini
[pytest]
testpaths = tests
asyncio_mode = auto
timeout = 120
markers =
    unit: Unit tests (no LLM calls)
    integration: Integration tests (requires API keys)
    eval: Evaluation tests (requires LangSmith)
```

```bash
# Spusti len unit testy (rýchle, bez API)
pytest -m unit

# Spusti integration testy
pytest -m integration

# Spusti všetko
pytest
```
