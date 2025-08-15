/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import Editor from '@monaco-editor/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';

import {parseHTML, parseJSON} from '@/lib/parse';
import {
  ANALYZE_VIDEO_PROMPT,
  ANALYZE_VIDEO_SYSTEM_INSTRUCTION,
  GENERATE_CODE_FROM_PLAN_PROMPT_PREFIX,
  GENERATE_CODE_FROM_PLAN_PROMPT_SUFFIX,
  GENERATE_CODE_SYSTEM_INSTRUCTION,
  GENERATE_SPEC_FROM_ANALYSIS_PROMPT,
  GENERATE_SPEC_SYSTEM_INSTRUCTION,
  REVIEW_SPEC_AND_PLAN_PROMPT,
  REVIEW_SPEC_SYSTEM_INSTRUCTION,
} from '@/lib/prompts';
import {generateText} from '@/lib/textGeneration';

interface ContentContainerProps {
  contentBasis: string;
  preSeededSpec?: string;
  preSeededCode?: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
}

interface File {
  name: string;
  content: string;
}

type GenerationStep =
  | 'idle'
  | 'analyzing'
  | 'spec-generating'
  | 'planning'
  | 'coding'
  | 'ready'
  | 'error';

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: 'Starting generation...',
  analyzing: 'Analyzing video...',
  'spec-generating': 'Generating app specification...',
  planning: 'Creating implementation plan...',
  coding: 'Generating code...',
  ready: 'Content ready!',
  error: 'An error occurred.',
};

export default forwardRef(function ContentContainer(
  {
    contentBasis,
    preSeededSpec,
    preSeededCode,
    onLoadingStateChange,
  }: ContentContainerProps,
  ref,
) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Generation state
  const [step, setStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);

  // Generated artifacts
  const [analysis, setAnalysis] = useState<object | null>(null);
  const [spec, setSpec] = useState<string>(preSeededSpec || '');
  const [plan, setPlan] = useState<object | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Render state
  const [renderHtml, setRenderHtml] = useState<string>('');
  const [iframeKey, setIframeKey] = useState(0);

  useImperativeHandle(ref, () => ({}));

  useEffect(() => {
    if (onLoadingStateChange) {
      const isLoading = !['ready', 'error', 'idle'].includes(step);
      onLoadingStateChange(isLoading);
    }
  }, [step, onLoadingStateChange]);

  const buildPreviewHtml = (fileSet: File[]): string => {
    const htmlFile = fileSet.find(
      (f) => f.name.toLowerCase() === 'index.html',
    );
    if (!htmlFile) return '<p>No index.html file found to render.</p>';

    let htmlContent = htmlFile.content;

    // Inject CSS
    const cssFiles = fileSet.filter((f) => f.name.toLowerCase().endsWith('.css'));
    const cssLinks = cssFiles
      .map((f) => `<style>\n${f.content}\n</style>`)
      .join('\n');
    htmlContent = htmlContent.replace('</head>', `${cssLinks}\n</head>`);

    // Inject JS
    const jsFiles = fileSet.filter((f) => f.name.toLowerCase().endsWith('.js'));
    const jsScripts = jsFiles
      .map((f) => `<script>\n${f.content}\n</script>`)
      .join('\n');
    htmlContent = htmlContent.replace('</body>', `${jsScripts}\n</body>`);

    return htmlContent;
  };

  useEffect(() => {
    async function generateContent() {
      if (preSeededSpec && preSeededCode) {
        setSpec(preSeededSpec);
        const preSeededFiles = [
          {name: 'index.html', content: preSeededCode},
        ];
        setFiles(preSeededFiles);
        setActiveFile('index.html');
        setRenderHtml(buildPreviewHtml(preSeededFiles));
        setStep('ready');
        return;
      }

      try {
        setStep('analyzing');
        const analysisResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: ANALYZE_VIDEO_SYSTEM_INSTRUCTION,
          prompt: ANALYZE_VIDEO_PROMPT,
          videoUrl: contentBasis,
        });
        const analysisResult = parseJSON(analysisResponse);
        setAnalysis(analysisResult);

        setStep('spec-generating');
        const specResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: GENERATE_SPEC_SYSTEM_INSTRUCTION,
          prompt: `${GENERATE_SPEC_FROM_ANALYSIS_PROMPT}\n\n${JSON.stringify(
            analysisResult,
            null,
            2,
          )}`,
        });
        setSpec(specResponse);

        setStep('planning');
        const planResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: REVIEW_SPEC_SYSTEM_INSTRUCTION,
          prompt: `${REVIEW_SPEC_AND_PLAN_PROMPT}\n\n${specResponse}`,
        });
        const planResult = parseJSON(planResponse);
        setPlan(planResult);

        setStep('coding');
        const codePrompt = `${GENERATE_CODE_FROM_PLAN_PROMPT_PREFIX}\n${specResponse}\n${GENERATE_CODE_FROM_PLAN_PROMPT_SUFFIX}\n${JSON.stringify(
          planResult,
          null,
          2,
        )}`;
        const codeResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: GENERATE_CODE_SYSTEM_INSTRUCTION,
          prompt: codePrompt,
        });
        const codeResult = parseJSON(codeResponse);
        const generatedFiles = codeResult.files || [];
        setFiles(generatedFiles);

        // Set active file to index.html or the first file
        const htmlFile = generatedFiles.find(
          (f: File) => f.name.toLowerCase() === 'index.html',
        );
        setActiveFile(htmlFile ? htmlFile.name : generatedFiles[0]?.name);

        setRenderHtml(buildPreviewHtml(generatedFiles));
        setStep('ready');
      } catch (err) {
        console.error('Error generating content:', err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
        setStep('error');
      }
    }

    generateContent();
  }, [contentBasis, preSeededSpec, preSeededCode]);

  useEffect(() => {
    if (renderHtml) {
      setIframeKey((prev) => prev + 1);
    }
  }, [renderHtml]);

  const CustomLoader = ({text}: {text: string}) => (
    <div className="custom-loader">
      <div className="loader-scanner">
        <span></span>
      </div>
      <p>{text}</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="error-state">
      <div className="error-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="48px"
          viewBox="0 0 24 24"
          width="48px"
          fill="currentColor">
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      </div>
      <h3>Content Generation Failed</h3>
      <p>{error || 'An unexpected error occurred.'}</p>
    </div>
  );

  const SpecItem = ({title, currentStep, completed, children}) => (
    <div className={`spec-item ${currentStep ? 'current' : ''}`}>
      <div className="spec-item-header">
        <div className="spec-item-status">
          {completed ? '✅' : currentStep ? '⏳' : '▶️'}
        </div>
        <h4>{title}</h4>
      </div>
      <div className="spec-item-content">{children}</div>
    </div>
  );

  return (
    <div className="content-container-wrapper">
      <Tabs
        className="tabs-container"
        selectedIndex={activeTabIndex}
        onSelect={(index) => setActiveTabIndex(index)}>
        <TabList className="tab-list">
          <Tab className="tab-item" selectedClassName="selected-tab">
            Render
          </Tab>
          <Tab className="tab-item" selectedClassName="selected-tab">
            Code
          </Tab>
          <Tab className="tab-item" selectedClassName="selected-tab">
            Spec
          </Tab>
        </TabList>

        <div className="tab-panels">
          <TabPanel
            className="tab-panel"
            selectedClassName="selected-tab-panel">
            {step === 'error' ? (
              renderErrorState()
            ) : step !== 'ready' ? (
              <CustomLoader text={STEP_MESSAGES[step]} />
            ) : (
              <div className="render-iframe-container">
                <iframe
                  key={iframeKey}
                  srcDoc={renderHtml}
                  className="render-iframe"
                  title="rendered-html"
                  sandbox="allow-scripts"
                />
              </div>
            )}
          </TabPanel>

          <TabPanel
            className="tab-panel"
            selectedClassName="selected-tab-panel">
            {step === 'error' ? (
              renderErrorState()
            ) : step !== 'ready' ? (
              <CustomLoader text={STEP_MESSAGES[step]} />
            ) : (
              <div className="vscode-container">
                <div className="file-explorer">
                  <h4>Files</h4>
                  <ul>
                    {files.map((file) => (
                      <li
                        key={file.name}
                        className={activeFile === file.name ? 'active' : ''}
                        onClick={() => setActiveFile(file.name)}>
                        <span className="file-icon">📄</span> {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="editor-pane">
                  <Editor
                    height="100%"
                    path={activeFile || 'file.txt'}
                    value={
                      files.find((f) => f.name === activeFile)?.content || ''
                    }
                    theme="vs-dark"
                    options={{
                      minimap: {enabled: false},
                      fontSize: 14,
                      wordWrap: 'on',
                      readOnly: true,
                    }}
                  />
                </div>
              </div>
            )}
          </TabPanel>

          <TabPanel
            className="tab-panel"
            selectedClassName="selected-tab-panel">
            <div className="spec-container">
              <SpecItem
                title="1. Video Analysis"
                currentStep={step === 'analyzing'}
                completed={!!analysis}>
                {step === 'analyzing' && <div className="mini-loader"></div>}
                {analysis && (
                  <pre>{JSON.stringify(analysis, null, 2)}</pre>
                )}
              </SpecItem>
              <SpecItem
                title="2. App Specification"
                currentStep={step === 'spec-generating'}
                completed={!!spec}>
                {step === 'spec-generating' && (
                  <div className="mini-loader"></div>
                )}
                {spec && <pre className="spec-text">{spec}</pre>}
              </SpecItem>
              <SpecItem
                title="3. Implementation Plan"
                currentStep={step === 'planning'}
                completed={!!plan}>
                {step === 'planning' && <div className="mini-loader"></div>}
                {plan && <pre>{JSON.stringify(plan, null, 2)}</pre>}
              </SpecItem>
            </div>
          </TabPanel>
        </div>
      </Tabs>
      <style>{`
        .content-container-wrapper {
          border: 1px solid var(--color-border);
          border-radius: 12px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background-color: var(--color-background-secondary);
          animation: fade-in 0.5s ease-out;
        }
        .tabs-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .tab-list {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid var(--color-border);
          position: relative;
        }
        .tab-item {
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          color: var(--color-text-secondary);
          font-weight: bold;
          position: relative;
          transition: color 0.3s ease;
          border-bottom: 3px solid transparent;
        }
        .tab-item:hover {
          color: var(--color-text);
        }
        .selected-tab {
          color: var(--color-accent);
          border-bottom: 3px solid var(--color-accent);
          box-shadow: var(--shadow-glow);
        }
        .tab-panels {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        .tab-panel {
          display: none;
          height: 100%;
          width: 100%;
          padding: 0;
          box-sizing: border-box;
          overflow: auto;
        }
        .selected-tab-panel {
          display: block;
          animation: fade-in 0.4s ease;
        }
        .render-iframe-container,
        .editor-container {
          height: 100%;
          width: 100%;
        }
        .render-iframe {
          border: none;
          width: 100%;
          height: 100%;
          background-color: #fff;
        }
        
        /* VS Code UI */
        .vscode-container {
          display: flex;
          height: 100%;
          background-color: #1e1e1e; /* VS Code dark theme bg */
        }
        .file-explorer {
          width: 200px;
          background-color: #252526;
          padding: 1rem;
          color: #ccc;
          overflow-y: auto;
          border-right: 1px solid var(--color-border);
        }
        .file-explorer h4 {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .file-explorer ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .file-explorer li {
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-technical);
          font-size: 0.9rem;
        }
        .file-explorer li:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .file-explorer li.active {
          background-color: var(--color-accent);
          color: var(--color-background);
          font-weight: bold;
        }
        .editor-pane {
          flex: 1;
          overflow: hidden;
        }

        /* Spec Tab */
        .spec-container {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .spec-item {
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: #1a1a22;
        }
        .spec-item-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid var(--color-border);
        }
        .spec-item.current .spec-item-header {
           color: var(--color-accent);
        }
        .spec-item-content {
          padding: 1rem;
          max-height: 300px;
          overflow-y: auto;
        }
        .spec-text {
          white-space: pre-wrap;
          font-family: var(--font-secondary);
          line-height: 1.6;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .spec-item-content pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: var(--font-technical);
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }
        .mini-loader {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(0, 242, 234, 0.3);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }


        /* Custom Loader */
        .custom-loader {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: var(--color-text-secondary);
        }
        .loader-scanner {
          width: 150px;
          height: 100px;
          border: 2px solid var(--color-border);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            var(--color-accent-secondary),
            transparent
          );
          opacity: 0.2;
        }
        .loader-scanner span {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: var(--color-accent);
          box-shadow: var(--shadow-glow);
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% { top: 0; }
          50% { top: 98px; }
          100% { top: 0; }
        }
        .custom-loader p {
          margin-top: 1.5rem;
          font-size: 1.1rem;
        }

        /* Error State */
        .error-state {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          padding: 2rem;
          color: var(--color-error);
        }
        .error-icon {
          font-family: var(--font-symbols);
          font-size: 4rem;
          margin-bottom: 1rem;
          text-shadow: 0 0 10px var(--color-error);
        }
        .error-state h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .error-state p {
          color: var(--color-text-secondary);
          max-width: 400px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
});
