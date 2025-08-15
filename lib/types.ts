/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export interface Example {
  title: string;
  url: string;
  spec: string;
  code: string;
}

export interface File {
  name: string;
  content: string;
}

export interface HistoryItem {
  id: number;
  title: string;
  videoUrl: string;
  spec: string;
  files: File[];
  timestamp: string;
}
