import fs from "fs";
import path from "path";
import YAML from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { Root } from "remark-frontmatter/lib";

export class Category {
  constructor(
    public title: string,
    public weight: number,
    public children: Array<Category>,
    public pages: Array<Page>,
    public run: boolean,
    public path: string,
  ) {}

  addChild(child: Category) {
    this.children.push(child);
  }

  addPage(page: Page) {
    this.pages.push(page);
  }
}

export class Page {
  constructor(
    public title: string,
    public file: string,
    public weight: number,
    public isIndex: boolean,
    public scripts: Array<Script>,
  ) {}
}

export class Script {
  constructor(
    public command: string,
    public wait: number,
    public timeout: number,
    public hook: string | null,
    public hookTimeout: number,
    public expectError: boolean,
    public lineNumber: number | undefined,
  ) {}
}

export class CustomGatherer {
  static TITLE_KEY: string = "title";
  static WEIGHT_KEY: string = "weight";
  static SIDEBAR_POSITION: string = "sidebar_position";
  static TIMEOUT_KEY: string = "timeout";
  static WAIT_KEY: string = "wait";
  static HOOK_KEY: string = "hook";
  static HOOK_TIMEOUT_KEY: string = "hookTimeout";
  static TEST_KEY: string = "test";
  static EXPECT_ERROR_KEY: string = "expectError";
  static RAW_KEY: string = "raw";

  static INDEX_PAGES: Array<string> = ["_index.md", "index.en.md", "index.md"];

  private parser = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .use(remarkDirective);

  public async gather(directory: string): Promise<Category | null> {
    if (!fs.existsSync(directory)) {
      throw new Error(`Directory '${directory}' not found`);
    }

    return await this.walk(directory);
  }

  private async walk(directory: string): Promise<Category | null> {
    const files = fs.readdirSync(directory);

    let title = "Unknown";
    let weight = 0;
    let run = true;
    const children: Array<Category> = [];
    const pages: Array<Page> = [];

    for (const item of files) {
      let itemPath = path.join(directory, item);

      let stats = fs.statSync(itemPath);

      if (item === ".notest") {
        run = false;
      } else if (stats.isDirectory()) {
        const result = await this.walk(itemPath);

        if (result) {
          children.push(result);
        }
      } else if (item.endsWith(".md")) {
        let page = await this.readPage(
          itemPath,
          directory,
          CustomGatherer.INDEX_PAGES.includes(item),
        );

        if (page) {
          if (page.isIndex) {
            title = page.title;
            weight = page.weight;

            page.weight = 1;
          }

          pages.push(page);
        }
      }
    }

    if (children.length === 0 && pages.length === 0) {
      return null;
    }

    return new Category(
      title,
      weight,
      children.sort(this.sortByWeight),
      pages.sort(this.sortByWeight),
      run,
      directory,
    );
  }

  private sortByWeight(a: any, b: any) {
    return a.weight - b.weight;
  }

  private async readPage(
    file: string,
    directory: string,
    isIndex: boolean,
  ): Promise<Page | null> {
    const data = await fs.promises.readFile(file, "utf8");

    const parsed = await this.parser.parse(data);

    let title = "Unknown";
    let weight = 0;

    const { children } = parsed;
    let child = children[0];

    if (child) {
      if (child.type === "yaml") {
        let value = child.value;

        let obj = YAML.parse(value);
        title = obj[CustomGatherer.TITLE_KEY];

        if (obj[CustomGatherer.WEIGHT_KEY] !== undefined) {
          weight = parseInt(obj[CustomGatherer.WEIGHT_KEY]);
        } else if (obj[CustomGatherer.SIDEBAR_POSITION] !== undefined) {
          weight = parseInt(obj[CustomGatherer.SIDEBAR_POSITION]);
        }
      } else {
        throw new Error(`No Frontmatter found at ${file}`);
      }

      const scripts = this.readScripts(parsed, directory);

      if (isIndex || scripts.length > 0) {
        return new Page(title, file, weight, isIndex, scripts);
      }
    }

    return null;
  }

  private readScripts(root: Root, directory: string): Array<Script> {
    const { children } = root;
    let data: Array<Script> = [];
    let i = -1;
    let child;

    while (++i < children.length) {
      child = children[i];

      // Look for containerDirective with name "code" and showCopyAction=true
      if (child.type === "containerDirective" && child.name === "code" && 
          child.attributes && child.attributes.showCopyAction === "true") {
        let add = true;
        let wait = 0;
        let timeout = 120;
        let hook: String | null = null;
        let hookTimeout = 0;
        let expectError = false;
        let raw = false;

        // Parse attributes from the directive
        if (child.attributes) {
          Object.entries(child.attributes).forEach(([key, value]) => {
            switch (key) {
              case CustomGatherer.WAIT_KEY:
                wait = parseInt(value as string);
                break;
              case CustomGatherer.TIMEOUT_KEY:
                timeout = parseInt(value as string);
                break;
              case CustomGatherer.TEST_KEY:
                add = value === "false" ? false : true;
                break;
              case CustomGatherer.EXPECT_ERROR_KEY:
                expectError = value === "true" ? true : false;
                break;
              case CustomGatherer.RAW_KEY:
                raw = value === "true" ? true : false;
                break;
              case CustomGatherer.HOOK_KEY:
                hook = value as string;
                break;
              case CustomGatherer.HOOK_TIMEOUT_KEY:
                hookTimeout = parseInt(value as string);
                break;
              case "showCopyAction":
                // Used for filtering, already handled in condition
                break;
              default:
                console.log(
                  `Warning: Unrecognized param ${key} in code directive`,
                );
            }
          });
        }

        if (add) {
          // Extract the code content from the directive's children
          let codeContent = this.extractCodeFromDirective(child);
          
          if (codeContent.length > 0) {
            let command = this.extractCommand(codeContent, raw);

            if (command.length > 0) {
              data.push(
                new Script(
                  command,
                  wait,
                  timeout,
                  hook,
                  hookTimeout,
                  expectError,
                  child.position?.start.line,
                ),
              );
            }
          }
        }
      }
    }

    return data;
  }

  private extractCodeFromDirective(directive: any): string {
    let content = "";
    
    if (directive.children) {
      for (const child of directive.children) {
        if (child.type === "code") {
          content += child.value || "";
        } else if (child.type === "paragraph" && child.children) {
          // Extract text from paragraph children
          for (const textChild of child.children) {
            if (textChild.type === "text") {
              content += textChild.value || "";
            }
          }
        } else if (child.type === "text") {
          content += child.value || "";
        }
      }
    }
    
    return content;
  }

  extractCommand(rawString: string, raw: boolean): string {
    if (raw) {
      return rawString;
    }

    let parts = rawString.split("\n");
    let commandParts = [];
    let inHeredoc = false;

    for (let commandPart of parts) {
      // Handle $ prefix if present, otherwise treat as command
      if (commandPart.startsWith("$")) {
        commandPart = commandPart.slice(2);
      }

      // Handle heredoc
      if (commandPart.indexOf("<<EOF") > -1) {
        inHeredoc = true;
      } else if (inHeredoc && commandPart.indexOf("EOF") > -1) {
        inHeredoc = false;
      }

      commandParts.push(commandPart);
    }

    return commandParts.join("\n");
  }
}
