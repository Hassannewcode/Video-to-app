/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export const ANALYZE_VIDEO_SYSTEM_INSTRUCTION = `You are an expert learning experience designer.`;
export const ANALYZE_VIDEO_PROMPT = `Analyze the provided video content and its metadata. 
Produce a JSON object that breaks down the video's educational potential. 
The JSON object must contain the following fields: 
- "title": A concise, descriptive title for the potential web app.
- "summary": A brief one-paragraph summary of the video's core concept.
- "key_topics": An array of strings listing the main topics covered.
- "target_audience": A string describing the ideal user for the complementary web app.
- "learning_goals": An array of strings, each describing a specific, measurable learning outcome a user should achieve after using the app.

ONLY return a single, valid JSON object and nothing else.`;

export const GENERATE_SPEC_SYSTEM_INSTRUCTION = `You are a product designer specializing in educational web apps.`;
export const GENERATE_SPEC_FROM_ANALYSIS_PROMPT = `Using the following JSON analysis of a video, write a detailed and self-contained spec for an interactive web app that achieves the specified learning goals. 

The spec should be clear enough for a junior web developer to implement. It must not mention the video it is based on. The app should be simple, playful, and highly effective. The output should be a markdown-formatted string.

Here is an example of a good spec:
"
In music, chords create expectations of movement toward certain other chords and resolution towards a tonal center. This is called functional harmony.

Build me an interactive web app to help a learner understand the concept of functional harmony.

SPECIFICATIONS:
1. The app must feature an interactive keyboard.
2. The app must showcase all 7 diatonic triads that can be created in a major key (i.e., tonic, supertonic, mediant, subdominant, dominant, submediant, leading chord).
3. The app must somehow describe the function of each of the diatonic triads, and state which other chords each triad tends to lead to.
4. The app must provide a way for users to play different chords in sequence and see the results.
[etc.]
"

Now, write a spec based on this JSON analysis:`;

export const REVIEW_SPEC_SYSTEM_INSTRUCTION = `You are a senior frontend engineer.`;
export const REVIEW_SPEC_AND_PLAN_PROMPT = `Review the following web app specification. Create a JSON object that outlines an implementation plan. 

The plan should favor a vanilla HTML, CSS, and JavaScript implementation broken into separate files.

The JSON object must contain the following fields:
- "files_to_create": An array of strings with filenames (e.g., ["index.html", "style.css", "script.js"]).
- "implementation_notes": A string in markdown describing the overall approach, component breakdown, and logic flow.

ONLY return a single, valid JSON object and nothing else.

SPECIFICATION TO REVIEW:`;

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

// Legacy prompts for pre-seeded examples
export const CODE_REGION_OPENER = '```';
export const CODE_REGION_CLOSER = '```';
export const SPEC_ADDENDUM = `\n\nThe app must be fully responsive and function properly on both desktop and mobile. Provide the code as a single, self-contained HTML document. All styles and scripts must be inline. In the result, encase the code between "${CODE_REGION_OPENER}" and "${CODE_REGION_CLOSER}" for easy parsing.`;
