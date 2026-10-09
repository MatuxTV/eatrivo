# OpenCode agents

Each `<name>.md` defines an agent. Frontmatter:

```markdown
---
description: What this agent does.
mode: subagent        # primary | subagent | all
model: anthropic/claude-opus-4-8   # optional
temperature: 0.2      # optional
tools:                # optional allow/deny
  write: false
---

System prompt becomes the agent's behavior.
```

Primary agents: switch with Tab. Subagents: invoke with `@name`.
