# LangGraph Architecture Patterns — Kompletný katalóg

## Table of Contents
1. Simple ReAct Agent
2. Plan-and-Execute
3. Supervisor Multi-Agent
4. Hierarchical Multi-Agent
5. Swarm / Handoff
6. Map-Reduce (Parallel)
7. Reflection / Self-Critique
8. Collaborative Multi-Agent
9. Router Pattern
10. Jak vybrať správny pattern

---

## 1. Simple ReAct Agent

**Kedy:** Jeden agent, tool calling, jednoduché úlohy (chatbot, Q&A, jednoduchá automatizácia).

**Topológia:**
```
START → llm_call → [tool_call | END]
              ↑          |
              └──────────┘
```

**Implementácia:**
```python
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage

class State(TypedDict):
    messages: Annotated[list, add_messages]

def llm_node(state: State) -> dict:
    system = SystemMessage(content="You are a helpful assistant.")
    response = model_with_tools.invoke([system] + state["messages"])
    return {"messages": [response]}

# Build
builder = StateGraph(State)
builder.add_node("llm", llm_node)
builder.add_node("tools", ToolNode(tools=tools))

builder.add_edge(START, "llm")
builder.add_conditional_edges("llm", tools_condition)
builder.add_edge("tools", "llm")

graph = builder.compile()
```

**Výhody:** Jednoduché, rýchle, ľahko pochopiteľné.
**Nevýhody:** Nedokáže plánovať, jednoduchá logika, jeden LLM robí všetko.

---

## 2. Plan-and-Execute

**Kedy:** Komplexné úlohy, kde treba najprv naplánovať kroky a potom ich vykonať. Research, analýza, content creation.

**Topológia:**
```
START → planner → executor → evaluator → [replanner | formatter → END]
                                              |              ↑
                                              └──────────────┘
```

**State:**
```python
class PlanExecuteState(TypedDict):
    messages: Annotated[list, add_messages]
    plan: list[str]           # Zoznam krokov
    current_step: int         # Aktuálny krok
    step_results: Annotated[list[str], operator.add]  # Výsledky krokov
    final_answer: Optional[str]
    iteration_count: int
```

**Nody:**
```python
def planner(state: PlanExecuteState) -> dict:
    """Vytvorí plán krokov na splnenie úlohy."""
    response = planner_llm.invoke([
        SystemMessage(content=PLANNER_PROMPT),
        *state["messages"]
    ])
    plan = parse_plan(response.content)  # Extrahuj kroky
    return {"plan": plan, "current_step": 0}

def executor(state: PlanExecuteState) -> dict:
    """Vykoná aktuálny krok plánu."""
    step = state["plan"][state["current_step"]]
    result = executor_llm_with_tools.invoke([
        SystemMessage(content=f"Execute this step: {step}"),
        *state["messages"]
    ])
    return {
        "step_results": [result.content],
        "current_step": state["current_step"] + 1,
        "messages": [AIMessage(content=f"Step completed: {result.content}")]
    }

def evaluator(state: PlanExecuteState) -> dict:
    """Vyhodnotí či je plán hotový alebo treba upraviť."""
    if state["current_step"] >= len(state["plan"]):
        return {"final_answer": synthesize(state["step_results"])}
    return {}

def route_after_eval(state: PlanExecuteState) -> str:
    if state.get("final_answer"):
        return "formatter"
    if state["iteration_count"] > 10:
        return "formatter"  # Force end
    return "executor"  # Pokračuj ďalším krokom
```

---

## 3. Supervisor Multi-Agent

**Kedy:** Viaceré špecializované agenty, jeden supervisor rozdeľuje prácu. Customer support s routing, research s viacerými zdrojmi.

**Topológia:**
```
START → supervisor → [researcher | writer | coder | ...] → supervisor → [... | END]
```

**State:**
```python
class SupervisorState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str
    agent_outputs: Annotated[list[dict], operator.add]
    task_complete: bool
```

**Supervisor node:**
```python
SUPERVISOR_PROMPT = """You are a supervisor managing these agents: {agents}.
Given the conversation, decide which agent should act next, or if the task is complete.
Respond with JSON: {{"next": "agent_name"}} or {{"next": "FINISH"}}"""

def supervisor(state: SupervisorState) -> dict:
    response = supervisor_llm.invoke([
        SystemMessage(content=SUPERVISOR_PROMPT.format(agents=agent_names)),
        *state["messages"]
    ])
    decision = parse_json(response.content)
    return {
        "next_agent": decision["next"],
        "task_complete": decision["next"] == "FINISH"
    }

def route_supervisor(state: SupervisorState) -> str:
    if state["task_complete"]:
        return END
    return state["next_agent"]

# Build
builder = StateGraph(SupervisorState)
builder.add_node("supervisor", supervisor)
for name, agent_fn in agents.items():
    builder.add_node(name, agent_fn)
    builder.add_edge(name, "supervisor")  # Každý agent vracia k supervisor

builder.add_edge(START, "supervisor")
builder.add_conditional_edges("supervisor", route_supervisor)
```

---

## 4. Hierarchical Multi-Agent

**Kedy:** Veľké systémy, kde jeden supervisor nestačí. Enterprise workflows, komplexné pipeline.

**Topológia:**
```
START → top_supervisor → [team_a_supervisor | team_b_supervisor]
                              |                    |
                         [agent_1 | agent_2]  [agent_3 | agent_4]
```

**Implementácia:** Použi subgrafy — každý tím je samostatný graf.

```python
# Team A subgraph
team_a = build_team_a_graph()  # Vracia CompiledGraph

# Team B subgraph
team_b = build_team_b_graph()

# Top-level graph
builder = StateGraph(TopState)
builder.add_node("top_supervisor", top_supervisor)
builder.add_node("team_a", team_a)  # Subgraf ako node
builder.add_node("team_b", team_b)

builder.add_edge(START, "top_supervisor")
builder.add_conditional_edges("top_supervisor", route_to_team)
builder.add_edge("team_a", "top_supervisor")
builder.add_edge("team_b", "top_supervisor")
```

---

## 5. Swarm / Handoff

**Kedy:** Agenti si dynamicky odovzdávajú kontrolu. Konverzačné systémy, kde sa mení kontext. Customer service s eskaláciou.

**Topológia:**
```
START → agent_a ←→ agent_b ←→ agent_c → END
```

**Implementácia s Command:**
```python
from langgraph.types import Command

def agent_a(state: State) -> Command:
    response = agent_a_llm.invoke(state["messages"])

    if should_handoff_to_b(response):
        return Command(
            goto="agent_b",
            update={"messages": [response], "active_agent": "agent_b"}
        )

    return Command(
        goto=END,
        update={"messages": [response]}
    )
```

---

## 6. Map-Reduce (Parallel)

**Kedy:** Rovnaká operácia na viacerých vstupoch, potom agregácia. Analýza dokumentov, multi-source research.

**Implementácia s Send:**
```python
from langgraph.types import Send

class OverallState(TypedDict):
    topics: list[str]
    research_results: Annotated[list[str], operator.add]
    final_summary: Optional[str]

def fan_out(state: OverallState):
    """Rozošli každý topic do samostatného research node."""
    return [Send("research", {"topic": t}) for t in state["topics"]]

def research(state: dict) -> dict:
    """Skúmaj jeden topic."""
    result = research_llm.invoke(f"Research: {state['topic']}")
    return {"research_results": [result.content]}

def synthesize(state: OverallState) -> dict:
    """Agreguj všetky výsledky."""
    summary = synthesis_llm.invoke(
        f"Summarize:\n" + "\n".join(state["research_results"])
    )
    return {"final_summary": summary.content}

builder = StateGraph(OverallState)
builder.add_node("research", research)
builder.add_node("synthesize", synthesize)
builder.add_conditional_edges(START, fan_out)
builder.add_edge("research", "synthesize")
builder.add_edge("synthesize", END)
```

---

## 7. Reflection / Self-Critique

**Kedy:** Kvalita výstupu je kritická. Content generation, code generation, analýza.

**Topológia:**
```
START → generator → critic → [generator (retry) | formatter → END]
```

```python
class ReflectionState(TypedDict):
    messages: Annotated[list, add_messages]
    draft: str
    critique: str
    revision_count: int
    is_satisfactory: bool

def generator(state: ReflectionState) -> dict:
    if state.get("critique"):
        prompt = f"Improve based on this feedback:\n{state['critique']}\n\nOriginal:\n{state['draft']}"
    else:
        prompt = state["messages"][-1].content

    draft = generator_llm.invoke(prompt)
    return {"draft": draft.content, "revision_count": state.get("revision_count", 0) + 1}

def critic(state: ReflectionState) -> dict:
    critique = critic_llm.invoke(
        f"Critically evaluate:\n{state['draft']}\n\nIs it satisfactory? Reply YES or NO with feedback."
    )
    is_good = "YES" in critique.content.upper()
    return {"critique": critique.content, "is_satisfactory": is_good}

def should_revise(state: ReflectionState) -> str:
    if state["is_satisfactory"] or state["revision_count"] >= 3:
        return "formatter"
    return "generator"
```

---

## 8. Collaborative Multi-Agent

**Kedy:** Viacero agentov pracuje na rovnakom výstupe z rôznych perspektív. Brainstorming, review process.

Podobné ako Supervisor, ale agenti čítajú a aktualizujú spoločný state bez centrálneho riadenia.

---

## 9. Router Pattern

**Kedy:** Vstup treba klasifikovať a routnuť do špecifickej pipeline. Často ako prvý layer.

```python
def router(state: State) -> dict:
    classification = classifier_llm.invoke(
        f"Classify this request into one of: {categories}\n{state['messages'][-1].content}"
    )
    return {"route": classification.content.strip().lower()}

def route_fn(state: State) -> str:
    return state["route"]

builder.add_conditional_edges("router", route_fn, {
    "billing": "billing_agent",
    "technical": "technical_agent",
    "general": "general_agent",
})
```

---

## 10. Ako vybrať správny pattern

```
Jednoduchý task, jeden agent?
  → Simple ReAct

Komplexný task, potrebujem plánovať?
  → Plan-and-Execute

Viacero špecializácií, centrálne riadenie?
  → Supervisor

Veľký systém, hierarchia tímov?
  → Hierarchical

Dynamický handoff medzi agentmi?
  → Swarm

Paralelné spracovanie, agregácia?
  → Map-Reduce

Kvalita je kritická, iterácia?
  → Reflection

Klasifikácia vstupu na začiatku?
  → Router (kombinuj s iným patternom)
```

**Kombinácie sú bežné:** Router → Supervisor → [Plan-and-Execute, ReAct, Reflection]
