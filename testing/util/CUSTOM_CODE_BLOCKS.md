# Custom Code Block Adaptation

This document describes the adaptation of the markdown testing tool to support `:::code{}` directive blocks instead of standard bash code fences.

## Changes Made

### 1. New Gatherer (`gatherer-custom.ts`)
- Added `remark-directive` plugin to parse `:::code{}` blocks
- Modified `readScripts()` to look for `containerDirective` with name "code"
- Updated `extractCodeFromDirective()` to handle paragraph/text content structure
- Attributes are parsed from the directive attributes object instead of meta string

### 2. New Main Class (`markdownsh-custom.ts`)
- Uses `CustomGatherer` instead of the original `Gatherer`
- All other functionality remains the same

### 3. New CLI (`cli-custom.ts`)
- Provides `markdown-sh-custom` command
- Same interface as original but uses custom parser

## Syntax Comparison

### Original (bash code fences):
```markdown
```bash timeout=30 expectError=true
$ echo "Hello World"
$ ls -la
```
```

### New (:::code{} directives):
```markdown
:::code{timeout=30 expectError=true}
$ echo "Hello World"
$ ls -la
:::
```

## Supported Attributes

All original attributes are supported:
- `test` - Whether to execute the block (default: true)
- `timeout` - Timeout in seconds (default: 120)
- `wait` - Wait time after execution (default: 0)
- `hook` - Hook name to execute
- `hookTimeout` - Hook timeout in seconds (default: 0)
- `expectError` - Ignore errors (default: false)
- `raw` - Execute entire block without parsing $ commands (default: false)

## Usage

```bash
# Build the project
npm run build

# Plan tests (show what would be executed)
node ./dist/cli-custom.js plan <directory>

# Run tests
node ./dist/cli-custom.js test <directory>

# Run with options
node ./dist/cli-custom.js test <directory> --debug --timeout 60
```

## Example Test File

```markdown
---
title: "My Test"
weight: 10
---

# My Test

:::code{timeout=30}
$ echo "Hello from custom code block"
$ ls -la
:::

:::code{expectError=true}
$ false
$ echo "This should not run"
:::

:::code{test=false}
$ echo "This block should be skipped"
:::

:::code{raw=true}
echo "Raw command without $ prefix"
date
:::
```

## Dependencies

The adaptation requires the `remark-directive` package:

```bash
npm install remark-directive
```

This package is already included in the updated `package.json`.
