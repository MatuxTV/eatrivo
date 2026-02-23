# Implementation Guide — LangGraph Kódové vzory

## Table of Contents
1. Project Setup
2. Node Patterns
3. Edge Patterns
4. Tool Integration
5. Error Handling
6. Streaming
7. Production Configuration

---

## 1. Project Setup

### Štruktúra projektu

```
my-agent/
├── pyproject.toml
├── .env
├── src/
│   ├── __init__.py
│   ├── graph.py            # Graf definícia a kompilace
│   ├── state.py            # State TypedDict
│   ├── nodes/              # Jeden súbor per node
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── planner.py
│   │   ├── executor.py
│   │   └── evaluator.py
│   ├── tools/              # Tool definície
│   │   ├── __init__.py
│   │   ├── search.py
│   │   └── database.py
│   ├── prompts/            # Prompt templates
│   │   ├── __init__.py
│   │   └── templates.py
│   ├── models/             # LLM konfigurácia
│   │   ├── __init__.py
│   │   └── config.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
│   ├── test_nodes.py
│   ├── test_graph.py
│   └── test_tools.py
└── langgraph.json          # Pre LangGraph Platform deploy
```

### Dependencies

```toml
# pyproject.toml
[project]
dependencies = [
    "langgraph>=0.4",
    "langchain-core>=0.3",
    "langchain-anthropic>=0.3",   # Alebo iný provider
    "langchain-community>=0.3",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "langsmith>=0.2",
]
```

### Základný setup

```python
# src/models/config.py
import os
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

def get_model(model_name: str = "claude-sonnet-4-20250514", **kwargs):
    """Konfigurovateľný model provider."""
    if "claude" in model_name:
        return ChatAnthropic(model=model_name, **kwargs)
    elif "gpt" in model_name:
        return ChatOpenAI(model=model_name, **kwargs)
    raise ValueError(f"Unknown model: {model_name}")
```

---

## 2. Node Patterns

### 2.1 LLM Node (základný)

```python
# src/nodes/planner.py
from langchain_core.messages import SystemMessage, AIMessage
from src.state import AgentState
from src.models.config import get_model
from src.prompts.templates import PLANNER_SYSTEM_PROMPT

model = get_model()

def planner_node(state: AgentState) -> dict:
    """
    Planner node — vytvorí plán na základe user inputu.

    Reads: messages
    Updates: plan, current_step
    Side effects: LLM call
    """
    response = model.invoke([
        SystemMessage(content=PLANNER_SYSTEM_PROMPT),
        *state["messages"]
    ])

    plan = parse_plan(response.content)

    return {
        "plan": plan,
        "current_step": "execute",
        "messages": [AIMessage(content=f"Plan created with {len(plan)} steps.")]
    }
```

### 2.2 Tool-calling Node

```python
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode

@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # implementácia
    return results

@tool
def query_database(sql: str) -> str:
    """Execute a SQL query against the database."""
    # implementácia
    return results

tools = [search_web, query_database]
tool_node = ToolNode(tools=tools)

# Alebo custom tool node s error handling:
def safe_tool_node(state: AgentState) -> dict:
    """Tool node s error handling."""
    try:
        result = tool_node.invoke(state)
        return result
    except Exception as e:
        return {
            "messages": [AIMessage(content=f"Tool error: {str(e)}")],
            "error": str(e),
            "retry_count": state.get("retry_count", 0) + 1,
        }
```

### 2.3 Human-in-the-Loop Node

```python
from langgraph.types import interrupt

def human_review_node(state: AgentState) -> dict:
    """
    Pauzne node — čaká na ľudský vstup.

    Reads: draft
    Updates: messages, approved
    Side effects: Interrupt (waits for human)
    """
    draft = state["draft"]

    # Toto pauznuje graf a čaká na ľudský vstup
    human_response = interrupt({
        "question": "Please review this draft and provide feedback:",
        "draft": draft,
        "options": ["approve", "revise", "reject"]
    })

    if human_response["action"] == "approve":
        return {"approved": True, "messages": [HumanMessage(content="Approved!")]}
    elif human_response["action"] == "revise":
        return {
            "approved": False,
            "critique": human_response.get("feedback", "Please revise."),
            "messages": [HumanMessage(content=f"Feedback: {human_response['feedback']}")]
        }
    else:
        return {"approved": False, "error": "Rejected by human reviewer"}
```

### 2.4 Validation Node

```python
from pydantic import BaseModel, ValidationError

class PlanSchema(BaseModel):
    steps: list[str]
    estimated_time: int
    complexity: str

def validation_node(state: AgentState) -> dict:
    """Validuje output predchádzajúceho node."""
    try:
        validated = PlanSchema.model_validate_json(state["raw_plan"])
        return {
            "plan": validated.model_dump(),
            "validation_passed": True,
        }
    except ValidationError as e:
        return {
            "error": f"Validation failed: {e}",
            "validation_passed": False,
            "retry_count": state.get("retry_count", 0) + 1,
        }
```

---

## 3. Edge Patterns

### 3.1 Simple Conditional

```python
def route_after_validation(state: AgentState) -> str:
    """Route based on validation result."""
    if state.get("error"):
        if state.get("retry_count", 0) < 3:
            return "retry_node"
        return "error_handler"

    if state.get("validation_passed"):
        return "next_step"

    return "error_handler"

builder.add_conditional_edges(
    "validation",
    route_after_validation,
    {
        "retry_node": "planner",      # Retry
        "next_step": "executor",      # Pokračuj
        "error_handler": "error_handler",
    }
)
```

### 3.2 Multi-output Conditional (parallel paths)

```python
from langgraph.types import Send

def fan_out_to_agents(state: AgentState) -> list[Send]:
    """Pošli prácu viacerým agentom paralelne."""
    sends = []
    for subtask in state["subtasks"]:
        sends.append(Send(
            subtask["assigned_agent"],
            {"task": subtask, "context": state["context"]}
        ))
    return sends
```

### 3.3 Sequence helper

```python
# Pre lineárne sekvencie
builder.add_sequence([
    "input_processor",
    "validator",
    "enricher",
    "formatter"
])
# Ekvivalent:
# builder.add_edge("input_processor", "validator")
# builder.add_edge("validator", "enricher")
# builder.add_edge("enricher", "formatter")
```

---

## 4. Tool Integration

### 4.1 Definovanie tools

```python
from langchain_core.tools import tool
from typing import Annotated

@tool
def calculate(expression: Annotated[str, "Mathematical expression to evaluate"]) -> str:
    """Safely evaluate a mathematical expression."""
    import ast
    try:
        tree = ast.parse(expression, mode='eval')
        result = eval(compile(tree, '<string>', 'eval'))
        return str(result)
    except Exception as e:
        return f"Error: {e}"

@tool
def get_weather(
    city: Annotated[str, "City name"],
    unit: Annotated[str, "Temperature unit: celsius or fahrenheit"] = "celsius"
) -> str:
    """Get current weather for a city."""
    # API call...
    return f"Weather in {city}: 22°{unit[0].upper()}"
```

### 4.2 Bind tools k modelu

```python
model = ChatAnthropic(model="claude-sonnet-4-20250514")
tools = [calculate, get_weather, search_web]
model_with_tools = model.bind_tools(tools)

def agent_node(state: AgentState) -> dict:
    response = model_with_tools.invoke(state["messages"])
    return {"messages": [response]}
```

### 4.3 tools_condition (prebuilt)

```python
from langgraph.prebuilt import tools_condition

# Automaticky routuje:
# - Ak response má tool_calls → "tools" node
# - Ak nie → END
builder.add_conditional_edges("agent", tools_condition)
```

---

## 5. Error Handling

### 5.1 Node-level error handling

```python
import logging
logger = logging.getLogger(__name__)

def robust_node(state: AgentState) -> dict:
    """Node s kompletným error handling."""
    try:
        # Hlavná logika
        result = do_work(state)
        return {
            "output": result,
            "error": None,
            "current_step": "next",
        }
    except TimeoutError:
        logger.warning("Node timed out, retrying...")
        return {
            "error": "timeout",
            "retry_count": state.get("retry_count", 0) + 1,
        }
    except Exception as e:
        logger.error(f"Node failed: {e}", exc_info=True)
        return {
            "error": str(e),
            "current_step": "error_handler",
        }
```

### 5.2 Global error handler node

```python
def error_handler(state: AgentState) -> dict:
    """Centralizovaný error handler."""
    error = state.get("error", "Unknown error")
    retry_count = state.get("retry_count", 0)

    logger.error(f"Error handler activated: {error} (retry #{retry_count})")

    return {
        "messages": [AIMessage(content=f"I encountered an issue: {error}. "
                                       f"Please try again or rephrase your request.")],
        "error": None,  # Reset error
        "retry_count": 0,
    }
```

### 5.3 Retry pattern

```python
MAX_RETRIES = 3

def should_retry(state: AgentState) -> str:
    if state.get("error") and state.get("retry_count", 0) < MAX_RETRIES:
        return "retry"
    if state.get("error"):
        return "error_handler"
    return "continue"
```

---

## 6. Streaming

### 6.1 Token-by-token streaming

```python
# Invoke so streamingom
async for event in graph.astream_events(
    {"messages": [HumanMessage(content="Tell me about AI")]},
    config={"configurable": {"thread_id": "123"}},
    version="v2",
):
    if event["event"] == "on_chat_model_stream":
        chunk = event["data"]["chunk"]
        if chunk.content:
            print(chunk.content, end="", flush=True)
```

### 6.2 Streaming intermediate steps

```python
async for chunk in graph.astream(
    {"messages": [HumanMessage(content="Research AI trends")]},
    config={"configurable": {"thread_id": "123"}},
    stream_mode="updates",  # Emituj po každom node
):
    node_name = list(chunk.keys())[0]
    node_output = chunk[node_name]
    print(f"[{node_name}] completed")
```

### 6.3 Custom stream events

```python
from langchain_core.callbacks import dispatch_custom_event

def my_node(state: AgentState) -> dict:
    # Emit custom event pre UI
    dispatch_custom_event("progress", {
        "step": "analyzing",
        "percent": 50,
        "message": "Analyzing data..."
    })
    # ... práca ...
    return {"output": result}
```

---

## 7. Production Configuration

### 7.1 langgraph.json (pre LangGraph Platform)

```json
{
  "dependencies": ["."],
  "graphs": {
    "my_agent": "./src/graph.py:graph"
  },
  "env": ".env"
}
```

### 7.2 Kompletný graph.py

```python
# src/graph.py
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

from src.state import AgentState
from src.nodes.router import router_node
from src.nodes.planner import planner_node
from src.nodes.executor import executor_node
from src.nodes.evaluator import evaluator_node
from src.nodes.formatter import formatter_node
from src.nodes.error_handler import error_handler_node

def build_graph(checkpointer=None):
    builder = StateGraph(AgentState)

    # Nodes
    builder.add_node("router", router_node)
    builder.add_node("planner", planner_node)
    builder.add_node("executor", executor_node)
    builder.add_node("evaluator", evaluator_node)
    builder.add_node("formatter", formatter_node)
    builder.add_node("error_handler", error_handler_node)

    # Edges
    builder.add_edge(START, "router")
    builder.add_conditional_edges("router", route_fn, {
        "simple": "formatter",
        "complex": "planner",
        "error": "error_handler",
    })
    builder.add_edge("planner", "executor")
    builder.add_edge("executor", "evaluator")
    builder.add_conditional_edges("evaluator", evaluate_fn, {
        "good": "formatter",
        "retry": "planner",
        "error": "error_handler",
    })
    builder.add_edge("formatter", END)
    builder.add_edge("error_handler", END)

    # Compile
    if checkpointer is None:
        checkpointer = InMemorySaver()

    return builder.compile(checkpointer=checkpointer)

# Default graph instance
graph = build_graph()
```

### 7.3 Environment config

```python
# src/models/config.py
import os

CONFIGS = {
    "development": {
        "model": "claude-sonnet-4-20250514",
        "temperature": 0.7,
        "max_tokens": 4096,
    },
    "production": {
        "model": "claude-sonnet-4-20250514",
        "temperature": 0.3,
        "max_tokens": 4096,
    },
    "testing": {
        "model": "claude-haiku-4-5-20251001",
        "temperature": 0,
        "max_tokens": 1024,
    },
}

def get_config():
    env = os.getenv("ENVIRONMENT", "development")
    return CONFIGS[env]
```
