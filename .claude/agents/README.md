# Claude Code subagents

Drop subagent definitions here as `<name>.md` with frontmatter:

```markdown
---
name: my-agent
description: When this agent should be invoked.
tools: Read, Grep, Glob   # optional; omit to inherit all
model: opus               # optional
---

System prompt for the subagent.
```

Invoke automatically (Claude delegates) or explicitly: "use the my-agent subagent".
