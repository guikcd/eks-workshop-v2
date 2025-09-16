#!/usr/bin/env node

import { Command } from "commander";
import { CustomMarkdownSh } from "./lib/markdownsh-custom.js";

const program = new Command();

program
  .name("markdown-sh-custom")
  .description("Test runner for markdown files with :::code{} blocks")
  .version("0.0.1");

program
  .command("test")
  .description("Run tests from markdown files")
  .argument("<directory>", "Directory containing markdown files")
  .option("--glob <pattern>", "Glob pattern to filter tests", "")
  .option("--debug", "Enable debug output", false)
  .option("--dry-run", "Show what would be executed without running", false)
  .option("--timeout <seconds>", "Default timeout for tests", "120")
  .option("--hook-timeout <seconds>", "Default timeout for hooks", "300")
  .option("--bail", "Stop on first failure", false)
  .option("--output <format>", "Output format (spec, xunit, json)", "spec")
  .option("--output-path <path>", "Output file path", "test-results.xml")
  .option("--before-each <command>", "Command to run before each test", "")
  .action(async (directory, options) => {
    const runner = new CustomMarkdownSh(options.glob, options.debug);
    
    await runner.test(
      directory,
      options.dryRun,
      parseInt(options.timeout),
      parseInt(options.hookTimeout),
      options.bail,
      options.output,
      options.outputPath,
      options.beforeEach
    );
  });

program
  .command("plan")
  .description("Show test plan without executing")
  .argument("<directory>", "Directory containing markdown files")
  .option("--glob <pattern>", "Glob pattern to filter tests", "")
  .option("--debug", "Enable debug output", false)
  .action(async (directory, options) => {
    const runner = new CustomMarkdownSh(options.glob, options.debug);
    await runner.plan(directory);
  });

program.parse();
