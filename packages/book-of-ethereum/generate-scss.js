import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import theme from "./theme.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scssVariables = Object.entries(theme)
  .map(([key, value]) => {
    if (key === "backgroundImage") {
      return `$${key}: url('${value}');`;
    }
    return `$${key}: ${value};`;
  })
  .join("\n");

const outputPath = path.resolve(__dirname, "src/styles/_theme.scss");

fs.writeFileSync(outputPath, scssVariables);

console.log(`_theme.scss has been generated successfully!`);