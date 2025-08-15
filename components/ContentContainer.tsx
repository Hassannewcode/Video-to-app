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

import {parseJSON} from '@/lib/parse';
import {
  ANALYZE_AND_PLAN_PROMPT,
  ANALYZE_AND_PLAN_SYSTEM_INSTRUCTION,
  GENERATE_CODE_FROM_PLAN_PROMPT_PREFIX,
  GENERATE_CODE_FROM_PLAN_PROMPT_SUFFIX,
  GENERATE_CODE_SYSTEM_INSTRUCTION,
  REVIEW_CODE_PROMPT_PREFIX,
  REVIEW_CODE_PROMPT_SUFFIX,
  REVIEW_CODE_SYSTEM_INSTRUCTION,
} from '@/lib/prompts';
import {generateText} from '@/lib/textGeneration';
import {File} from '@/lib/types';

interface ContentContainerProps {
  contentBasis: string;
  preSeededSpec?: string;
  preSeededFiles?: File[];
  onLoadingStateChange?: (isLoading: boolean) => void;
  onGenerationComplete?: (result: {
    title: string;
    spec: string;
    files: File[];
  }) => void;
}

type ConsoleMessage = {
  type: 'log' | 'warn' | 'error' | 'info';
  args: any[];
  timestamp: Date;
};

type GenerationStep =
  | 'idle'
  | 'planning'
  | 'coding'
  | 'reviewing'
  | 'ready'
  | 'error';

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: 'Starting generation...',
  planning: 'Analyzing video and creating app plan...',
  coding: 'Generating code...',
  reviewing: 'Reviewing and fixing code...',
  ready: 'Content ready!',
  error: 'An error occurred.',
};

export default forwardRef(function ContentContainer(
  {
    contentBasis,
    preSeededSpec,
    preSeededFiles,
    onLoadingStateChange,
    onGenerationComplete,
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

  // Render and Console state
  const [renderHtml, setRenderHtml] = useState<string>('');
  const [iframeKey, setIframeKey] = useState(0);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isReviewed, setIsReviewed] = useState(false);

  useImperativeHandle(ref, () => ({}));

  useEffect(() => {
    if (onLoadingStateChange) {
      const isLoading = !['ready', 'error', 'idle'].includes(step);
      onLoadingStateChange(isLoading);
    }
  }, [step, onLoadingStateChange]);

  const CONSOLE_INJECT_SCRIPT = `
    <script>
      const originalConsole = { ...window.console };
      function postMessageToParent(type, args) {
        try {
          // Naive serialization, handles basic types, arrays, and plain objects.
          // Errors and complex objects might lose some data.
          const serializedArgs = args.map(arg => {
            if (arg instanceof Error) {
              return { message: arg.message, stack: arg.stack, name: arg.name };
            }
            return arg;
          });
          window.parent.postMessage({
              source: 'iframe-console',
              type: type,
              args: JSON.parse(JSON.stringify(serializedArgs))
          }, '*');
        } catch(e) {
          originalConsole.error('Error posting message to parent:', e);
          window.parent.postMessage({
              source: 'iframe-console',
              type: 'error',
              args: ['Could not serialize message arguments for parent console.']
          }, '*');
        }
      }
      
      Object.keys(originalConsole).forEach(key => {
        if (typeof originalConsole[key] === 'function') {
          console[key] = function(...args) {
            originalConsole[key](...args);
            postMessageToParent(key, args);
          };
        }
      });

      window.addEventListener('error', function(event) {
          postMessageToParent('error', [event.message, 'at ' + event.filename + ':' + event.lineno + ':' + event.colno]);
      });
      window.addEventListener('unhandledrejection', event => {
        postMessageToParent('error', ['Unhandled promise rejection:', event.reason]);
      });
    </script>
  `;

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
    htmlContent = htmlContent.replace(
      '</head>',
      `${CONSOLE_INJECT_SCRIPT}\n${cssLinks}\n</head>`,
    );

    // Inject JS
    const jsFiles = fileSet.filter((f) => f.name.toLowerCase().endsWith('.js'));
    const jsScripts = jsFiles
      .map((f) => `<script>\n${f.content}\n</script>`)
      .join('\n');
    htmlContent = htmlContent.replace('</body>', `${jsScripts}\n</body>`);

    return htmlContent;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'iframe-console') {
        const {type, args} = event.data;
        setConsoleMessages((prev) => [
          ...prev,
          {type, args, timestamp: new Date()},
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    async function generateContent() {
      setConsoleMessages([]); // Clear console on new generation

      if (preSeededSpec && preSeededFiles) {
        setSpec(preSeededSpec);
        setFiles(preSeededFiles);
        const htmlFile = preSeededFiles.find(
          (f) => f.name.toLowerCase() === 'index.html',
        );
        setActiveFile(htmlFile ? htmlFile.name : preSeededFiles[0]?.name);
        setRenderHtml(buildPreviewHtml(preSeededFiles));
        setStep('ready');
        return;
      }

      try {
        setStep('planning');
        const planResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: ANALYZE_AND_PLAN_SYSTEM_INSTRUCTION,
          prompt: ANALYZE_AND_PLAN_PROMPT,
          videoUrl: contentBasis,
        });
        const planResult = parseJSON(planResponse);
        setAnalysis(planResult.analysis);
        setSpec(planResult.spec);
        setPlan(planResult.plan);

        setStep('coding');
        const codePrompt = `${GENERATE_CODE_FROM_PLAN_PROMPT_PREFIX}\n${
          planResult.spec
        }\n${GENERATE_CODE_FROM_PLAN_PROMPT_SUFFIX}\n${JSON.stringify(
          planResult.plan,
          null,
          2,
        )}`;
        const codeResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: GENERATE_CODE_SYSTEM_INSTRUCTION,
          prompt: codePrompt,
        });
        const codeResult = parseJSON(codeResponse);

        setStep('reviewing');
        const initialFiles = codeResult.files || [];

        // Capture initial runtime errors by loading code in a hidden iframe
        const capturedErrors: ConsoleMessage[] = await new Promise(
          (resolve) => {
            if (initialFiles.length === 0) {
              resolve([]);
              return;
            }

            const tempIframe = document.createElement('iframe');
            tempIframe.style.display = 'none';
            tempIframe.sandbox.add('allow-scripts');
            const tempErrors: ConsoleMessage[] = [];

            const handleTempMessage = (event: MessageEvent) => {
              if (event.source !== tempIframe.contentWindow) return;
              if (event.data && event.data.source === 'iframe-console') {
                const {type, args} = event.data;
                if (type === 'error') {
                  tempErrors.push({type, args, timestamp: new Date()});
                }
              }
            };
            window.addEventListener('message', handleTempMessage);

            const cleanupAndResolve = () => {
              window.removeEventListener('message', handleTempMessage);
              if (document.body.contains(tempIframe)) {
                document.body.removeChild(tempIframe);
              }
              resolve(tempErrors);
            };

            tempIframe.onload = () => setTimeout(cleanupAndResolve, 1500);
            tempIframe.onerror = cleanupAndResolve;
            setTimeout(cleanupAndResolve, 3000); // Failsafe timeout

            tempIframe.srcdoc = buildPreviewHtml(initialFiles);
            document.body.appendChild(tempIframe);
          },
        );

        let runtimeErrorsString = 'No runtime errors detected on initial load.';
        if (capturedErrors.length > 0) {
          runtimeErrorsString =
            'The following runtime errors were detected on initial load:\n' +
            capturedErrors
              .map((e) =>
                e.args
                  .map((arg) =>
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
                  )
                  .join(' '),
              )
              .join('\n');
        }

        const reviewPrompt = `${REVIEW_CODE_PROMPT_PREFIX}\n${
          planResult.spec
        }\n${REVIEW_CODE_PROMPT_SUFFIX}\n${JSON.stringify(
          codeResult,
          null,
          2,
        )}\n\nRUNTIME ERRORS:\n---\n${runtimeErrorsString}`;

        const reviewedCodeResponse = await generateText({
          modelName: 'gemini-2.5-flash',
          systemInstruction: REVIEW_CODE_SYSTEM_INSTRUCTION,
          prompt: reviewPrompt,
        });

        const reviewedCodeResult = parseJSON(reviewedCodeResponse);
        const finalFiles = reviewedCodeResult.files || [];
        setIsReviewed(true);
        setFiles(finalFiles);

        // Set active file to index.html or the first file
        const htmlFile = finalFiles.find(
          (f: File) => f.name.toLowerCase() === 'index.html',
        );
        setActiveFile(htmlFile ? htmlFile.name : finalFiles[0]?.name);

        setRenderHtml(buildPreviewHtml(finalFiles));
        setStep('ready');

        if (onGenerationComplete) {
          onGenerationComplete({
            title: planResult.analysis?.title || 'Generated App',
            spec: planResult.spec,
            files: finalFiles,
          });
        }
      } catch (err) {
        console.error('Error generating content:', err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
        setStep('error');
      }
    }

    generateContent();
  }, [contentBasis, preSeededSpec, preSeededFiles, onGenerationComplete]);

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

  const ConsoleView = () => (
    <div className="console-view">
      <div className="console-header">
        <span>Console</span>
        <button onClick={() => setConsoleMessages([])}>Clear</button>
      </div>
      <div className="console-messages">
        {consoleMessages.length === 0 ? (
          <div className="console-message-empty">
            Console is empty. Logs from the app will appear here.
          </div>
        ) : (
          consoleMessages.map((msg, index) => (
            <div key={index} className={`console-message ${msg.type}`}>
              <span className="timestamp">
                {msg.timestamp.toLocaleTimeString()}
              </span>
              <div className="message-content">
                {msg.args.map((arg, i) => (
                  <pre key={i}>
                    {typeof arg === 'object'
                      ? JSON.stringify(arg, null, 2)
                      : String(arg)}
                  </pre>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const isPlanning = step === 'planning';
  const planningComplete = !!plan;

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
          <Tab className="tab-item" selectedClassName="selected-tab">
            Console
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
                currentStep={isPlanning}
                completed={planningComplete}>
                {isPlanning && <div className="mini-loader"></div>}
                {analysis && <pre>{JSON.stringify(analysis, null, 2)}</pre>}
              </SpecItem>
              <SpecItem
                title="2. App Specification"
                currentStep={isPlanning}
                completed={planningComplete}>
                {isPlanning && <div className="mini-loader"></div>}
                {spec && <pre className="spec-text">{spec}</pre>}
              </SpecItem>
              <SpecItem
                title="3. Implementation Plan"
                currentStep={isPlanning}
                completed={planningComplete}>
                {isPlanning && <div className="mini-loader"></div>}
                {plan && <pre>{JSON.stringify(plan, null, 2)}</pre>}
              </SpecItem>
              <SpecItem
                title="4. Code Review & Fix"
                currentStep={step === 'reviewing'}
                completed={isReviewed}>
                {step === 'reviewing' && <div className="mini-loader"></div>}
                {isReviewed && (
                  <p>
                    Code automatically reviewed and fixed using runtime console
                    feedback.
                  </p>
                )}
              </SpecItem>
            </div>
          </TabPanel>

          <TabPanel
            className="tab-panel"
            selectedClassName="selected-tab-panel">
            <ConsoleView />
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
        .spec-item-content p {
          color: var(--color-text-secondary);
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

        /* Console View */
        .console-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: var(--font-technical);
          font-size: 0.9rem;
          background-color: #1e1e1e;
        }
        .console-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: #252526;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        .console-header button {
          background: none;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .console-messages {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .console-message {
          display: flex;
          gap: 1rem;
          padding: 0.25rem 0.5rem;
          border-bottom: 1px solid #333;
        }
        .console-message .timestamp {
          color: #888;
        }
        .console-message.log { color: #ccc; }
        .console-message.info { color: #3794ff; }
        .console-message.warn { color: #f9c74f; }
        .console-message.error { color: #f94144; }
        .message-content {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .message-content pre {
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
        }
        .console-message-empty {
          color: #888;
          padding: 1rem;
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