import { spawnSync } from "child_process";
import {
    parseExpr,
    symDiff,
    symIntegrate,
    symSimplify,
    symToLatex
} from "./slang-math.js";

export function runSlangPipeline(userSlangInput) {
    try {

        const mathString = userSlangInput
            .replace(/[a-zA-Z\s]+(of|find|the)\s+/ig, "")
            .trim();

        let intent = null;

        try {
            const pythonProcess = spawnSync(
                "python",
                ["predict.py", userSlangInput],
                { encoding: "utf-8" }
            );

            if (!pythonProcess.error && pythonProcess.stdout) {
                const output = pythonProcess.stdout.trim();

                try {
                    intent = JSON.parse(output);
                } catch (e) {
                    intent = output.toLowerCase();
                }
            }
        } catch (e) {
            intent = null;
        }

        const mathAst = parseExpr(mathString);

        const lowerInput = userSlangInput.toLowerCase();

        let task = "simplify";
        let variable = "x";

        if (intent && typeof intent === "object" && intent.task) {
            task = intent.task;
            if (intent.variable) variable = intent.variable;
        } else if (typeof intent === "string") {
            if (intent.includes("deriv") || lowerInput.includes("deriv")) {
                task = "diff";
            } else if (intent.includes("integr") || lowerInput.includes("integr")) {
                task = "integrate";
            }
        } else {
            if (lowerInput.includes("deriv")) task = "diff";
            else if (lowerInput.includes("integr")) task = "integrate";
        }

        let solvedAst = mathAst;

        if (task === "diff") {
            solvedAst = symDiff(mathAst, variable);
        }

        if (task === "integrate") {
            solvedAst = symIntegrate(mathAst, variable);
        }

        const simplifiedAst = symSimplify(solvedAst);

        let rawResult = symToLatex(simplifiedAst);

        rawResult = rawResult.replace(/\s+/g, "");

        return `🔥 Result: ${rawResult}`;

    } catch (error) {
        return `🔥 Pipeline crashed. Error: ${error.message}`;
    }
}

const userInput = process.argv[2];

if (userInput) {
    console.log(runSlangPipeline(userInput));
}
