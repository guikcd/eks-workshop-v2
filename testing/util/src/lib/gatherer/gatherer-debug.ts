import fs from "fs";
import path from "path";
import YAML from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { Root } from "remark-frontmatter/lib";

export class DebugGatherer {
  private parser = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .use(remarkDirective);

  public async debugParse(file: string) {
    const data = await fs.promises.readFile(file, "utf8");
    const parsed = await this.parser.parse(data);
    
    console.log("=== PARSED AST ===");
    console.log(JSON.stringify(parsed, null, 2));
    
    console.log("\n=== CHILDREN TYPES ===");
    parsed.children.forEach((child: any, index: number) => {
      console.log(`${index}: ${child.type} ${child.name ? `(${child.name})` : ''}`);
    });
  }
}
