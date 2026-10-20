# Claude Code slash commands

Each `<name>.md` becomes `/<name>`. Frontmatter is optional:

```markdown
---
description: One-line summary shown in the menu.
argument-hint: [pr-number]
---

Prompt body. Use $ARGUMENTS or $1, $2 for args; !`cmd` to inline shell output.
```
