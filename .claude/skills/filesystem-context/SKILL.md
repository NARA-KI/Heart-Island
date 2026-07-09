---
name: filesystem-context
description: "This skill should be used when agent work needs file-backed context: durable scratchpads, tool-output offloading, just-in-time discovery, cross-agent handoff files, filesystem memory, or cleanup policies for context stored outside the prompt."
---

# Filesystem-Based Context Engineering

Use the filesystem as the primary overflow layer for agent context because context windows are limited while tasks often require more information than fits in a single window.

Prefer dynamic context discovery -- pulling relevant context on demand -- over static inclusion, because static context consumes tokens regardless of relevance.

## When to Activate

Activate this skill when:
- Tool outputs are bloating the context window
- Agents need to persist state across long trajectories
- Sub-agents must share information without direct message passing
- Tasks require more context than fits in the window
- Building agents that learn and update their own instructions

Do not activate for: semantic cross-session memory (memory-systems), conversation summarization (context-compression), token-efficiency without file-backed storage (context-optimization), multi-agent topology design (multi-agent-patterns).

## Core Patterns

1. **Filesystem as Scratch Pad**: Redirect large tool outputs to files instead of returning them directly to context.
2. **Plan Persistence**: Write plans to the filesystem because long-horizon tasks lose coherence when plans fall out of attention.
3. **Sub-Agent Communication via Filesystem**: Route sub-agent findings through the filesystem instead of message passing.
4. **Dynamic Skill Loading**: Store skills as files and include only skill names with brief descriptions in static context.
5. **Terminal and Log Persistence**: Persist terminal output to files automatically and use grep for selective retrieval.
6. **Learning Through Self-Modification**: Have agents write learned preferences and patterns to their own instruction files.

## Guidelines

1. Write large outputs to files; return summaries and references to context
2. Store plans and state in structured files for re-reading
3. Use sub-agent file workspaces instead of message chains
4. Load skills dynamically rather than stuffing all into system prompt
5. Persist terminal and log output as searchable files
6. Combine grep/glob with semantic search for comprehensive discovery
7. Organize files for agent discoverability with clear naming
8. Measure token savings to validate filesystem patterns are effective
9. Implement cleanup for scratch files to prevent unbounded growth

## Gotchas

1. Scratch directory unbounded growth — implement retention policy
2. Race conditions in multi-agent file access — enforce per-agent directory isolation
3. Stale file references after moves/renames — verify file existence before reading
4. File size assumptions — check file size before reading; use line-range reads
5. Hardcoded absolute paths — use relative paths from project root

(See source repo muratcankoylan/Agent-Skills-for-Context-Engineering for full reference.)
