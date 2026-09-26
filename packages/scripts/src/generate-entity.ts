// @ts-ignore
import { generateEntity } from "../../../bin/generator.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../..");

const rawName = process.argv[2];
if (!rawName) {
  console.error("❌ Error: Please provide an entity name. Example: npm run generate-entity User");
  process.exit(1);
}

generateEntity(rawName, ROOT_DIR);
