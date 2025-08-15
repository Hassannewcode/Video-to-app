/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export const ANALYZE_AND_PLAN_SYSTEM_INSTRUCTION = `You are an expert learning experience designer and a senior frontend engineer.`;
export const ANALYZE_AND_PLAN_PROMPT = `Analyze the key concepts from the provided video content, focusing on the first 5 minutes to generate your response. Based on your analysis, design an interactive web app.
Produce a single, valid JSON object and nothing else. The JSON object must contain the following keys:
- "analysis": An object with the following fields:
  - "title": A concise, descriptive title for the potential web app.
  - "summary": A brief one-paragraph summary of the video's core concept.
  - "key_topics": An array of strings listing the main topics covered.
  - "target_audience": A string describing the ideal user for the complementary web app.
  - "learning_goals": An array of strings, each describing a specific, measurable learning outcome.
- "spec": A string in markdown format. This should be a detailed and self-contained spec for the interactive web app that achieves the specified learning goals. It must be clear enough for a junior web developer to implement and should not mention the video it is based on.
- "plan": An object with the following fields:
  - "files_to_create": An array of strings with filenames (e.g., ["index.html", "style.css", "script.js"]). This plan should favor a vanilla HTML, CSS, and JavaScript implementation.
  - "implementation_notes": A string in markdown describing the overall approach, component breakdown, and logic flow.`;

export const GENERATE_CODE_SYSTEM_INSTRUCTION = `You are a world-class senior frontend engineer.`;
export const GENERATE_CODE_FROM_PLAN_PROMPT_PREFIX = `Based on the provided specification and implementation plan, generate the code for all the required files. 
The app must be fully responsive and self-contained. All file content should be complete and production-ready.

The output MUST be a single, valid JSON object. This object must have a single key: "files". 
The value of "files" must be an array of objects. Each object in the array must have two keys: 
- "name": A string for the filename (e.g., "index.html").
- "content": A string containing the full code for that file.

DO NOT include any explanations or markdown formatting outside of the JSON object.

SPECIFICATION:
---`;

export const GENERATE_CODE_FROM_PLAN_PROMPT_SUFFIX = `---
IMPLEMENTATION PLAN:
---`;

export const REVIEW_CODE_SYSTEM_INSTRUCTION = `You are a world-class senior frontend engineer specializing in code review and debugging. Your task is to analyze the provided HTML, CSS, and JavaScript files for any bugs, errors, or inconsistencies, taking into account the original specification and any runtime errors that occurred during an initial test run. You should fix them and provide the corrected, production-ready code without changing the core functionality described in the spec. Ensure the app is fully responsive, accessible, and works across modern browsers. The output MUST be a single, valid JSON object with a single key: "files", which is an array of objects, each with "name" and "content".`;

export const REVIEW_CODE_PROMPT_PREFIX = `Based on the provided specification, please review and fix the following code for a web app. Pay close attention to the runtime errors that were captured, as they indicate immediate problems that need to be addressed.
The output MUST be a single, valid JSON object with a single key: "files", which is an array of objects, each with "name" and "content".
DO NOT include any explanations or markdown formatting outside of the JSON object.

SPECIFICATION:
---`;

export const REVIEW_CODE_PROMPT_SUFFIX = `---
CODE TO REVIEW:
---`;

// Legacy prompts for pre-seeded examples
export const CODE_REGION_OPENER = '```';
export const CODE_REGION_CLOSER = '```';
export const SPEC_ADDENDUM = `\n\nThe app must be fully responsive and function properly on both desktop and mobile. Provide the code as a single, self-contained HTML document. All styles and scripts must be inline. In the result, encase the code between "${CODE_REGION_OPENER}" and "${CODE_REGION_CLOSER}" for easy parsing.`;