# State Design — LangGraph Best Practices

## Table of Contents
1. Základy State v LangGraph
2. Reducer Patterns
3. State schéma podľa use case
4. State kompozícia a subgrafy
5. Checkpointing a serializácia
6. Anti-patterns

---

## 1. Základy State v LangGraph

State je **centrálny objekt**, ktorý preteká celým grafom. Každý node ho číta a vracia čiastočný update.

```python
from typing import TypedDict, Annotated, Optional
from langgraph.graph.message import add_messages
import operator

class MyState(TypedDict):
    # Pole s REDUCEROM — nové hodnoty sa PRIDÁVAJÚ k existujúcim
    messages: Annotated[list, add_messages]
    collected_data: Annotated[list[str], operator.add]

    # Pole BEZ reducera — nové hodnoty PREPÍŠU existujúce
    current_step: str
    user_input: str
    final_output: Optional[str]
```

**Kľúčový koncept:** TypedDict definuje schému. Annotated s reducerom definuje AKO sa state aktualizuje.

---

## 2. Reducer Patterns

### 2.1 Append (operator.add)

Pridáva nové položky k existujúcemu listu.

```python
class State(TypedDict):
    steps_taken: Annotated[list[str], operator.add]

# Node vráti:
return {"steps_taken": ["new_step"]}  # Pridá sa k existujúcemu listu
```

### 2.2 Message Reducer (add_messages)

Špeciálny reducer pre messages — handluje deduplication podľa ID.

```python
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]

# Node vráti:
return {"messages": [AIMessage(content="Hello")]}
# Message sa pridá. Ak má rovnaké ID ako existujúca, prepíše ju.
```

### 2.3 Custom Reducer

```python
def merge_dicts(existing: dict, new: dict) -> dict:
    """Deep merge dvoch dicts."""
    result = {**existing}
    for key, value in new.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    return result

class State(TypedDict):
    metadata: Annotated[dict, merge_dicts]
```

### 2.4 Overwrite (žiadny reducer)

```python
class State(TypedDict):
    current_status: str  # Vždy sa prepíše poslednou hodnotou

# Node vráti:
return {"current_status": "processing"}  # Prepíše akúkoľvek predchádzajúcu hodnotu
```

### 2.5 Explicit Overwrite (langgraph.types.Overwrite)

Keď CHCEŠ prepísať aj keď je reducer definovaný:

```python
from langgraph.types import Overwrite

class State(TypedDict):
    items: Annotated[list[str], operator.add]

# Normálne: pridá
return {"items": ["new"]}  # items = ["old", "new"]

# S Overwrite: prepíše
return {"items": Overwrite(value=["fresh_start"])}  # items = ["fresh_start"]
```

---

## 3. State schéma podľa use case

### 3.1 Chatbot / Conversational Agent

```python
class ChatState(TypedDict):
    messages: Annotated[list, add_messages]
    user_info: Optional[dict]        # Profil užívateľa (z memory)
    current_tool_calls: list[dict]   # Aktívne tool calls
```

### 3.2 Research Agent

```python
class ResearchState(TypedDict):
    messages: Annotated[list, add_messages]
    query: str                                      # Pôvodný dotaz
    search_queries: list[str]                       # Generované search queries
    sources: Annotated[list[dict], operator.add]    # Nájdené zdroje
    findings: Annotated[list[str], operator.add]    # Extrahované zistenia
    draft: Optional[str]                            # Draft odpovede
    critique: Optional[str]                         # Self-critique
    final_answer: Optional[str]
    iteration_count: int
```

### 3.3 Code Generation Agent

```python
class CodeGenState(TypedDict):
    messages: Annotated[list, add_messages]
    requirements: str                        # Špecifikácia
    plan: list[dict]                         # Implementačný plán
    current_file: Optional[str]              # Aktuálne editovaný súbor
    generated_code: dict[str, str]           # filename → code content
    test_results: Annotated[list[dict], operator.add]
    errors: Annotated[list[str], operator.add]
    iteration_count: int
```

### 3.4 Customer Support Supervisor

```python
class SupportState(TypedDict):
    messages: Annotated[list, add_messages]
    customer_id: Optional[str]
    category: Optional[str]               # billing, technical, general
    sentiment: Optional[str]              # positive, negative, neutral
    priority: Optional[str]               # low, medium, high, critical
    active_agent: str                     # Aktuálne aktívny agent
    resolution: Optional[str]
    escalated: bool
    agent_notes: Annotated[list[str], operator.add]
```

### 3.5 Data Processing Pipeline

```python
class PipelineState(TypedDict):
    raw_data: Any                           # Vstupné dáta
    validated_data: Optional[Any]           # Po validácii
    transformed_data: Optional[Any]         # Po transformácii
    enriched_data: Optional[Any]            # Po obohatení
    output: Optional[Any]                   # Finálny výstup
    processing_log: Annotated[list[str], operator.add]
    errors: Annotated[list[str], operator.add]
    current_stage: str
```

### 3.6 Multi-Agent Collaboration

```python
class CollabState(TypedDict):
    messages: Annotated[list, add_messages]
    task_description: str
    subtasks: list[dict]                                # Rozdelené úlohy
    agent_outputs: Annotated[list[dict], operator.add]  # Výstupy agentov
    consensus: Optional[str]                            # Dohodnutý výsledok
    votes: Annotated[list[dict], operator.add]          # Hlasovanie agentov
    iteration_count: int
```

---

## 4. State kompozícia a subgrafy

### Input/Output schéma pre subgrafy

```python
# Parent state
class ParentState(TypedDict):
    messages: Annotated[list, add_messages]
    research_result: Optional[str]
    writing_result: Optional[str]

# Child state (subgraf) — môže byť iný
class ResearchSubState(TypedDict):
    messages: Annotated[list, add_messages]
    query: str
    sources: Annotated[list[dict], operator.add]
    summary: Optional[str]

# Subgraf automaticky mapuje spoločné keys (messages)
# Pre explicitné mapovanie:

def enter_research(state: ParentState) -> ResearchSubState:
    """Transform parent state → child state."""
    return {
        "messages": state["messages"],
        "query": state["messages"][-1].content,
        "sources": [],
        "summary": None,
    }

def exit_research(state: ResearchSubState) -> dict:
    """Transform child state → parent state update."""
    return {
        "research_result": state["summary"],
        "messages": state["messages"],
    }
```

### Private vs Shared state keys

```python
# Keys zdieľané medzi parent a child grafom
# → mapujú sa automaticky ak majú rovnaký názov

# Private keys (len v subgrafe)
# → existujú len počas execúcie subgrafu
# → parent ich nevidí
```

---

## 5. Checkpointing a serializácia

### Všetko v state MUSÍ byť serializovateľné

```python
# ✅ Serializovateľné
class GoodState(TypedDict):
    messages: list          # JSON-serializable
    count: int
    data: dict[str, str]
    flags: list[bool]
    optional_field: Optional[str]

# ❌ NIE serializovateľné
class BadState(TypedDict):
    connection: DatabaseConnection  # ❌ Objekt
    callback: Callable              # ❌ Funkcia
    model: ChatAnthropic            # ❌ LLM instance
    df: pd.DataFrame                # ❌ Pandas (konvertuj na dict/list)
```

### Checkpointer setup

```python
# Development — in-memory
from langgraph.checkpoint.memory import InMemorySaver
checkpointer = InMemorySaver()

# Production — PostgreSQL
from langgraph.checkpoint.postgres import PostgresSaver
checkpointer = PostgresSaver.from_conn_string("postgresql://...")

# Production — SQLite
from langgraph.checkpoint.sqlite import SqliteSaver
checkpointer = SqliteSaver.from_conn_string("sqlite:///checkpoints.db")

# Kompiluj s checkpointerom
graph = builder.compile(checkpointer=checkpointer)

# Invoke s thread_id pre persistenciu
config = {"configurable": {"thread_id": "user-123-session-456"}}
result = graph.invoke({"messages": [HumanMessage(content="Hi")]}, config)

# Ďalšia správa v rovnakom threade — pamätá si kontext
result2 = graph.invoke({"messages": [HumanMessage(content="What did I say?")]}, config)
```

---

## 6. Anti-patterns

### ❌ Príliš veľký state

```python
# ❌ Celý dokument v state
class BadState(TypedDict):
    full_document_text: str  # 100KB+ text v state pri každom kroku

# ✅ Referencia na dokument
class GoodState(TypedDict):
    document_id: str          # Len ID, načítaj keď treba
    document_summary: str     # Krátky súhrn pre kontext
```

### ❌ Nekonzistentné kľúče

```python
# ❌ Rôzne nody používajú rôzne názvy pre to isté
return {"result": "..."}      # Node A
return {"output": "..."}      # Node B
return {"final_result": "..."} # Node C

# ✅ Konzistentné pomenovanie
return {"step_output": "..."}  # Všetky nody
```

### ❌ State ako globálna premenná

```python
# ❌ Side effects mimo state
global_results = []

def my_node(state):
    global_results.append(result)  # ❌ Toto neprežije checkpoint restore
    return {}

# ✅ Všetko v state
def my_node(state):
    return {"results": [result]}  # ✅ Serializované, persistentné
```

### ❌ Chýbajúci iteration guard

```python
# ❌ Možný infinite loop
def should_continue(state):
    if state["quality"] < threshold:
        return "retry"  # Čo ak quality nikdy nie je dobrá?
    return "end"

# ✅ S guardом
def should_continue(state):
    if state["iteration_count"] > MAX_ITERATIONS:
        return "force_end"  # Vždy skončí
    if state["quality"] < threshold:
        return "retry"
    return "end"
```
