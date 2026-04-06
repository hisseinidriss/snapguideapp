import { describe, expect, it } from "vitest";
import { normalizeManualImportData } from "./manual-import";

describe("normalizeManualImportData", () => {
  it("normalizes a step-only API response into a single process", () => {
    const result = normalizeManualImportData(
      {
        steps: [
          { title: "Log in", content: "Log in to OMS with your username and password.", selector: "", placement: "bottom" },
        ],
      },
      "OMS-Project_Creation_-_User_Manual.pdf"
    );

    expect(result).toHaveLength(1);
    expect(result[0].steps).toHaveLength(1);
    expect(result[0].steps[0].title).toBe("Log in");
  });

  it("falls back to parsing numbered steps from extracted text", () => {
    const text = [
      "Project Creation - User Manual",
      "Step 1 log in to OMS with your username and password.",
      "Step 2 click on the Projects Overview button from the Project Management dashboard.",
      "Step 3 click Create Project and fill in the Basic Data and Estimated Cost & Financing Plan sections.",
      "Step 4 save the screen and the project will be created with status Pipeline.",
    ].join(" ");

    const result = normalizeManualImportData({ steps: [] }, "OMS-Project_Creation_-_User_Manual.pdf", text);

    expect(result).toHaveLength(1);
    expect(result[0].steps).toHaveLength(4);
    expect(result[0].steps[0].title).toContain("Log");
    expect(result[0].steps[1].title).toContain("Projects Overview");
  });

  it("preserves process-based responses", () => {
    const result = normalizeManualImportData(
      {
        processes: [
          {
            name: "Project Creation",
            steps: [{ title: "Create", content: "Create the project.", selector: "", placement: "bottom" }],
          },
        ],
      },
      "Project Creation Manual.pdf"
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Project Creation");
  });
});
