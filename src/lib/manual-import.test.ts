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

  it("falls back to parsing numbered steps from extracted text (coarse)", () => {
    const text = [
      "Project Creation - User Manual",
      "Step 1 log in to OMS with your username and password.",
      "Step 2 click on the Projects Overview button from the Project Management dashboard.",
      "Step 3 click Create Project and fill in the Basic Data and Estimated Cost & Financing Plan sections.",
      "Step 4 save the screen and the project will be created with status Pipeline.",
    ].join(" ");

    const result = normalizeManualImportData({ steps: [] }, "OMS-Project_Creation_-_User_Manual.pdf", text, "coarse");

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

  it("expands dense steps into sub-actions in fine mode", () => {
    const text = [
      "Step 1 log in to OMS with your username and password.",
      'Step 2 After successful login, click on the "Projects Overview" button. The Projects List screen will be displayed. Click on "Create Project" button. A list of project profiles will be displayed, Click on the needed one.',
      'Step 3 The "Create Project" will be displayed as shown below. Fill in the Basic Data section. Fill in the Estimated Cost & Financing Plan. Click on the icon to add the needed Modes of Finance. The "Create Mode of Finance" pop up will be displayed, Make the needed selections and save the screen. Please note that the Modes Of Finance requested total must be equal to the IDB requested contribution. Check the list of possible duplicate projects and confirm by checking the "Confirm" checkbox and providing the "Reason". Save the screen after creating all the needed modes of Finances.',
      "Step 4 The project will be successfully created with status Pipeline.",
    ].join(" ");

    const result = normalizeManualImportData({ steps: [] }, "OMS-Project_Creation_-_User_Manual.pdf", text, "fine");

    expect(result).toHaveLength(1);
    // Fine mode should expand the dense Step 2 and Step 3
    expect(result[0].steps.length).toBeGreaterThanOrEqual(9);
    expect(result[0].steps.length).toBeLessThanOrEqual(14);
  });

  it("coarse mode keeps original step count", () => {
    const text = [
      "Step 1 log in to OMS.",
      'Step 2 Click on "Projects Overview". The list will be displayed. Click Create Project.',
      'Step 3 Fill in Basic Data. Fill in Estimated Cost. Click to add Modes of Finance. Save the screen.',
      "Step 4 Project created.",
    ].join(" ");

    const coarse = normalizeManualImportData({ steps: [] }, "test.pdf", text, "coarse");
    const fine = normalizeManualImportData({ steps: [] }, "test.pdf", text, "fine");

    expect(coarse[0].steps).toHaveLength(4);
    expect(fine[0].steps.length).toBeGreaterThan(4);
  });
});
