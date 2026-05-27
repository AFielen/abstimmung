import { strict as assert } from "node:assert";
import { stripMarkdown } from "./markdown";

function expect(label: string, input: string, expected: string) {
  const actual = stripMarkdown(input);
  assert.equal(actual, expected, `${label}: got ${JSON.stringify(actual)}`);
  console.log(`ok  ${label}`);
}

expect("plain text passes through", "Hallo Welt", "Hallo Welt");
expect("bold wird entfernt", "Wir **beschließen** X", "Wir beschließen X");
expect("italic wird entfernt", "Hinweis: *wichtig*", "Hinweis: wichtig");
expect("kombiniert", "Der **Vorstand** *empfiehlt*", "Der Vorstand empfiehlt");
expect(
  "listenpunkte werden bullets",
  "Beschluss:\n- Punkt eins\n- Punkt zwei",
  "Beschluss:\n• Punkt eins\n• Punkt zwei",
);
expect(
  "nummerierte liste bleibt",
  "1. erstens\n2. zweitens",
  "1. erstens\n2. zweitens",
);
expect("leerer string", "", "");
expect("null wird leer", null as unknown as string, "");

console.log("\nstripMarkdown: alle Erwartungen erfüllt.");
