/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export const parseJSON = (str: string) => {
  // Handle markdown code blocks for JSON
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = str.match(jsonRegex);
  let jsonString = str;
  if (match && match[1]) {
    jsonString = match[1];
  }

  // Find the first and last curly brace or square bracket
  const firstBrace = jsonString.indexOf('{');
  const firstBracket = jsonString.indexOf('[');
  let start = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No valid JSON object or array found in the string.');
  }

  if (firstBrace === -1) {
    start = firstBracket;
  } else if (firstBracket === -1) {
    start = firstBrace;
  } else {
    start = Math.min(firstBrace, firstBracket);
  }

  const lastBrace = jsonString.lastIndexOf('}');
  const lastBracket = jsonString.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket) + 1;

  if (start === -1 || end === 0) {
    throw new Error('No valid JSON object or array found in the string.');
  }

  return JSON.parse(jsonString.substring(start, end));
};

export const parseHTML = (str: string, opener: string, closer: string) => {
  const start = str.indexOf('<!DOCTYPE html>');
  const end = str.lastIndexOf(closer);
  return str.substring(start, end);
};
