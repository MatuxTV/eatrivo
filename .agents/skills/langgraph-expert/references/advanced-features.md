# Advanced Features — LangGraph

## Table of Contents
1. Human-in-the-Loop
2. Subgrafy
3. Memory (Short-term & Long-term)
4. Time Travel & Debugging
5. Multi-Agent Orchestration
6. MCP Integration
7. Deployment (LangGraph Platform)

---

## 1. Human-in-the-Loop

### 1.1 Interrupt pattern

```python
from langgraph.types import interrupt, Command

def review_node(state: State) -> dict:
    """Pauznuje graf a čaká na ľudský vstup."""
    draft = state["draft"]

    # interrupt() pauznuje exekúciu
    # Hodnota sa pošle klientovi
    feedback = interrupt({
        "type": "review_request",
        "content": draft,
        "instructions": "Please review and approve or provide feedback."
    })

    # Keď sa exekúcia obnoví, feedback obsahuje odpoveď
    return {
        "human_feedback": feedback,
        "messages": [HumanMessage(content=f"Feedback: {feedback}")]
    }
```

### 1.2 Resuming po interrupt

```python
# Prvé spustenie — pauznuje sa na review_node
config = {"configurable": {"thread_id": "review-123"}}
result = graph.invoke({"messages": [HumanMessage(content="Write report")]}, config)
# → Pauznuje sa, vráti interrupt info

# Obnovenie s ľudským vstupom
from langgraph.types import Command

graph.invoke(
    Command(resume={"action": "approve", "comment": "Looks great!"}),
    config
)
```

### 1.3 Approval gate pattern

```python
def approval_gate(state: State) -> Command:
    """Vyžaduje explicitné schválenie pred pokračovaním."""
    action = state["proposed_action"]

    approval = interrupt({
        "type": "approval_required",
        "action": action,
        "risk_level": state.get("risk_level", "medium"),
    })

    if approval.get("approved"):
        return Command(goto="execute_action", update={"approved": True})
    else:
        return Command(goto="revise_action", update={
            "approved": False,
            "rejection_reason": approval.get("reason", "")
        })
```

---

## 2. Subgrafy

### 2.1 Samostatný subgraf

```python
# research_subgraph.py
class ResearchState(TypedDict):
    query: str
    sources: Annotated[list, operator.add]
    summary: Optional[str]

def search_node(state: ResearchState) -> dict:
    results = search_tool(state["query"])
    return {"sources": results}

def summarize_node(state: ResearchState) -> dict:
    summary = llm.invoke(f"Summarize: {state['sources']}")
    return {"summary": summary.content}

def build_research_graph():
    builder = StateGraph(ResearchState)
    builder.add_node("search", search_node)
    builder.add_node("summarize", summarize_node)
    builder.add_edge(START, "search")
    builder.add_edge("search", "summarize")
    builder.add_edge("summarize", END)
    return builder.compile()

research_graph = build_research_graph()
```

### 2.2 Subgraf v parent grafe

```python
# parent_graph.py
class ParentState(TypedDict):
    messages: Annotated[list, add_messages]
    research_output: Optional[str]
    writing_output: Optional[str]

parent_builder = StateGraph(ParentState)
parent_builder.add_node("coordinator", coordinator_node)
parent_builder.add_node("research", research_graph)  # Subgraf ako node
parent_builder.add_node("writing", writing_graph)
parent_builder.add_node("review", review_node)

parent_builder.add_edge(START, "coordinator")
parent_builder.add_conditional_edges("coordinator", route_fn)
parent_builder.add_edge("research", "coordinator")
parent_builder.add_edge("writing", "review")
parent_builder.add_edge("review", END)
```

### 2.3 State mapovanie medzi parent a child

Ak child a parent majú rôzne state schémy, použi input/output transformáciu:

```python
# Parent state key → child state key mapovanie
# Ak majú rovnaký názov, mapuje sa automaticky
# Ak nie, treba explicitný wrapper node

def enter_subgraph(state: ParentState) -> ResearchState:
    return {
        "query": state["messages"][-1].content,
        "sources": [],
        "summary": None,
    }

def exit_subgraph(state: ResearchState) -> dict:
    return {"research_output": state["summary"]}
```

---

## 3. Memory

### 3.1 Short-term memory (v rámci session)

Automaticky cez checkpointer + thread_id:

```python
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "session-123"}}

# Prvá správa
graph.invoke({"messages": [HumanMessage(content="My name is John")]}, config)

# Druhá správa — pamätá si
graph.invoke({"messages": [HumanMessage(content="What's my name?")]}, config)
# → "Your name is John"
```

### 3.2 Long-term memory (naprieč sessions)

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()

# Uloženie memory
store.put(
    namespace=("user", "user-123"),
    key="preferences",
    value={"language": "sk", "timezone": "CET"}
)

# Načítanie v node
def personalized_node(state: State, *, store: BaseStore) -> dict:
    memories = store.search(namespace=("user", state["user_id"]))
    preferences = memories[0].value if memories else {}

    response = llm.invoke([
        SystemMessage(content=f"User preferences: {preferences}"),
        *state["messages"]
    ])
    return {"messages": [response]}

# Kompiluj so store
graph = builder.compile(checkpointer=checkpointer, store=store)
```

---

## 4. Time Travel & Debugging

### 4.1 Získaj históriu stavov

```python
config = {"configurable": {"thread_id": "debug-session"}}

# Získaj všetky stavy
states = list(graph.get_state_history(config))
for state in states:
    print(f"Step: {state.metadata.get('step')}")
    print(f"Node: {state.metadata.get('source')}")
    print(f"State: {state.values}")
    print("---")
```

### 4.2 Cestovanie v čase

```python
# Vráť sa k konkrétnemu stavu
target_state = states[3]  # Tretí krok

# Pokračuj od tohto bodu s iným vstupom
graph.invoke(
    {"messages": [HumanMessage(content="Try different approach")]},
    {"configurable": {
        "thread_id": "debug-session",
        "checkpoint_id": target_state.config["configurable"]["checkpoint_id"]
    }}
)
```

### 4.3 LangSmith tracing

```python
import os
os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = "..."
os.environ["LANGSMITH_PROJECT"] = "my-agent"

# Všetky graph.invoke() sú automaticky tracované
# Vizualizuj na https://smith.langchain.com
```

---

## 5. Multi-Agent Orchestration

### 5.1 Supervisor s create_react_agent

```python
from langgraph.prebuilt import create_react_agent

# Špecializovaní agenti
research_agent = create_react_agent(
    model=ChatAnthropic(model="claude-sonnet-4-20250514"),
    tools=[search_tool, wiki_tool],
    prompt="You are a research specialist."
)

writing_agent = create_react_agent(
    model=ChatAnthropic(model="claude-sonnet-4-20250514"),
    tools=[text_tools],
    prompt="You are a professional writer."
)

# Supervisor graf
class SupervisorState(TypedDict):
    messages: Annotated[list, add_messages]
    next: str

builder = StateGraph(SupervisorState)
builder.add_node("supervisor", supervisor_node)
builder.add_node("researcher", research_agent)
builder.add_node("writer", writing_agent)

builder.add_edge(START, "supervisor")
builder.add_conditional_edges("supervisor", lambda s: s["next"], {
    "researcher": "researcher",
    "writer": "writer",
    "FINISH": END,
})
builder.add_edge("researcher", "supervisor")
builder.add_edge("writer", "supervisor")
```

### 5.2 Agent handoff s Command

```python
from langgraph.types import Command

def agent_a(state: State) -> Command:
    response = agent_a_model.invoke(state["messages"])

    # Rozhodnutie o handoff
    if needs_specialist(response):
        return Command(
            goto="agent_b",
            update={
                "messages": [response],
                "handoff_reason": "Needs specialist knowledge"
            }
        )

    return Command(
        goto=END,
        update={"messages": [response]}
    )
```

---

## 6. MCP Integration

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

# Pripojenie k MCP serverom
async with MultiServerMCPClient({
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@anthropic-ai/mcp-filesystem"],
    },
    "database": {
        "url": "http://localhost:3001/sse",
    }
}) as client:
    tools = client.get_tools()

    agent = create_react_agent(
        model=ChatAnthropic(model="claude-sonnet-4-20250514"),
        tools=tools,
    )
```

---

## 7. Deployment

### 7.1 LangGraph Platform (Cloud)

```json
// langgraph.json
{
  "dependencies": ["."],
  "graphs": {
    "my_agent": "./src/graph.py:graph"
  },
  "env": ".env"
}
```

```bash
# Deploy
langgraph deploy --config langgraph.json
```

### 7.2 Self-hosted

```python
# FastAPI wrapper
from fastapi import FastAPI
from langserve import add_routes

app = FastAPI()
add_routes(app, graph, path="/agent")

# Alebo priamo:
@app.post("/invoke")
async def invoke(request: InvokeRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    result = await graph.ainvoke({"messages": request.messages}, config)
    return result
```

### 7.3 Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY src/ src/
COPY langgraph.json .
CMD ["langgraph", "up", "--host", "0.0.0.0", "--port", "8000"]
```
