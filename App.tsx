/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import ContentContainer from '@/components/ContentContainer';
import ExampleGallery from '@/components/ExampleGallery';
import HistoryGallery from '@/components/HistoryGallery';
import {DataContext} from '@/context';
import {Example, File, HistoryItem} from '@/lib/types';
import {getYoutubeEmbedUrl, validateYoutubeUrl} from '@/lib/youtube';
import {useContext, useEffect, useRef, useState} from 'react';

// Whether to validate the input URL before attempting to generate content
const VALIDATE_INPUT_URL = true;

// Whether to pre-seed with example content
const PRESEED_CONTENT = false;

// Helper function to load a shared state by ID
export default function App() {
  const {defaultExample, examples} = useContext(DataContext);

  const [videoUrl, setVideoUrl] = useState(
    PRESEED_CONTENT ? defaultExample?.url : '',
  );

  const [urlValidating, setUrlValidating] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState('');

  const contentContainerRef = useRef<{} | null>(null);

  const [reloadCounter, setReloadCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedExample, setSelectedExample] = useState<Example | null>(
    PRESEED_CONTENT ? defaultExample : null,
  );

  const [preSeededSpec, setPreSeededSpec] = useState<string | undefined>(
    PRESEED_CONTENT ? defaultExample?.spec : undefined,
  );
  const [preSeededFiles, setPreSeededFiles] = useState<File[] | undefined>(
    PRESEED_CONTENT
      ? [{name: 'index.html', content: defaultExample?.code}]
      : undefined,
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('videoAppHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !urlValidating && !contentLoading) {
      handleSubmit();
    }
  };

  const handleExampleSelect = (example: Example) => {
    if (inputRef.current) {
      inputRef.current.value = example.url;
    }
    setError('');
    setVideoUrl(example.url);
    setSelectedExample(example);
    setPreSeededSpec(example.spec);
    setPreSeededFiles([{name: 'index.html', content: example.code}]);
    setReloadCounter((c) => c + 1);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (inputRef.current) {
      inputRef.current.value = item.videoUrl;
    }
    setError('');
    setVideoUrl(item.videoUrl);
    setSelectedExample(null);
    setPreSeededSpec(item.spec);
    setPreSeededFiles(item.files);
    setReloadCounter((c) => c + 1);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('videoAppHistory');
  };

  const handleGenerationComplete = (result: {
    title: string;
    spec: string;
    files: File[];
  }) => {
    const newItem: HistoryItem = {
      id: Date.now(),
      title: result.title,
      videoUrl: inputRef.current?.value.trim() || videoUrl,
      spec: result.spec,
      files: result.files,
      timestamp: new Date().toISOString(),
    };
    const newHistory = [newItem, ...history].slice(0, 20); // Keep max 20 items
    setHistory(newHistory);
    localStorage.setItem('videoAppHistory', JSON.stringify(newHistory));
  };

  const handleSubmit = async () => {
    const inputValue = inputRef.current?.value.trim() || '';

    if (!inputValue) {
      inputRef.current?.focus();
      return;
    }

    if (urlValidating) return;

    setUrlValidating(true);
    setError('');
    setVideoUrl('');
    setContentLoading(false);
    setSelectedExample(null);
    setPreSeededSpec(undefined);
    setPreSeededFiles(undefined);

    const isPreSeededExample = [defaultExample, ...examples].some(
      (example) => example.url === inputValue,
    );

    if (isPreSeededExample) {
      proceedWithVideo(inputValue);
      return;
    }

    if (VALIDATE_INPUT_URL) {
      try {
        const validationResult = await validateYoutubeUrl(inputValue);

        if (validationResult.isValid) {
          proceedWithVideo(inputValue);
        } else {
          setError(validationResult.error || 'Invalid YouTube URL');
          setUrlValidating(false);
        }
      } catch (e) {
        setError('Could not validate URL. Please check the link and try again.');
        setUrlValidating(false);
      }
    } else {
      proceedWithVideo(inputValue);
    }
  };

  const proceedWithVideo = (url: string) => {
    setVideoUrl(url);
    setReloadCounter((c) => c + 1);
    setUrlValidating(false);
  };

  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
  };

  const exampleGallery = (
    <ExampleGallery
      title={PRESEED_CONTENT ? 'More examples' : 'Examples'}
      onSelectExample={handleExampleSelect}
      selectedExample={selectedExample}
    />
  );

  const isGenerating = urlValidating || contentLoading;

  return (
    <>
      <main className="main-container">
        <div className="left-side">
          <div
            className="header-content fade-in-up"
            style={{animationDelay: '0.1s'}}>
            <h1 className="headline">VIDEO-DRIVEN APPS</h1>
            <p className="subtitle">
              Generate interactive learning experiences from YouTube content
              with AI
            </p>
            <p className="attribution">
              An experiment by <strong>Aaron Wade</strong>
            </p>
          </div>

          <div
            className="input-section fade-in-up"
            style={{animationDelay: '0.2s'}}>
            <label htmlFor="youtube-url" className="input-label">
              Paste a YouTube URL
            </label>
            <div className="input-row">
              <input
                ref={inputRef}
                id="youtube-url"
                className="youtube-input"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                defaultValue={PRESEED_CONTENT ? defaultExample?.url : ''}
                disabled={isGenerating}
                onKeyDown={handleKeyDown}
                onChange={() => {
                  setError('');
                  setVideoUrl('');
                  setSelectedExample(null);
                  setPreSeededFiles(undefined);
                  setPreSeededSpec(undefined);
                }}
              />
              <button
                onClick={handleSubmit}
                className="button-primary submit-button"
                disabled={isGenerating}>
                {isGenerating && <div className="button-loader"></div>}
                <span className="button-text">
                  {urlValidating
                    ? 'Validating'
                    : contentLoading
                    ? 'Generating'
                    : 'Generate'}
                </span>
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>

          <div
            className="video-container fade-in-up"
            style={{animationDelay: '0.3s'}}>
            {videoUrl ? (
              <iframe
                className="video-iframe"
                src={getYoutubeEmbedUrl(videoUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen></iframe>
            ) : (
              <div className="video-placeholder">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <style>{`
                    .pulse { animation: pulse 2s infinite ease-in-out; }
                    @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
                  `}</style>
                  <g className="pulse">
                    <path
                      d="M16.3467 10.6533C17.4133 11.2667 17.4133 12.7333 16.3467 13.3467L10.96 16.5133C9.89333 17.1267 8.60667 16.3933 8.60667 15.1667V8.83333C8.60667 7.60667 9.89333 6.87333 10.96 7.48667L16.3467 10.6533Z"
                      fill="currentColor"
                    />
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </g>
                </svg>
                <span>Video appears here</span>
              </div>
            )}
          </div>

          <div
            className="gallery-container desktop-gallery-container fade-in-up"
            style={{animationDelay: '0.4s'}}>
            {exampleGallery}
            <HistoryGallery
              history={history}
              onSelectItem={handleHistorySelect}
              onClearHistory={handleClearHistory}
            />
          </div>
        </div>

        <div className="right-side">
          <div
            className="content-area slide-in-right"
            style={{animationDelay: '0.5s'}}>
            {videoUrl ? (
              <ContentContainer
                key={reloadCounter}
                contentBasis={videoUrl}
                onLoadingStateChange={handleContentLoadingStateChange}
                preSeededSpec={preSeededSpec}
                preSeededFiles={preSeededFiles}
                onGenerationComplete={handleGenerationComplete}
                ref={contentContainerRef}
              />
            ) : (
              <div className="content-placeholder">
                <div className="placeholder-grid">
                  {Array.from({length: 100}).map((_, i) => (
                    <div
                      key={i}
                      className="placeholder-dot"
                      style={{
                        animationDelay: `${Math.random() * 2}s`,
                      }}></div>
                  ))}
                </div>
                <p>
                  {urlValidating
                    ? 'Validating URL...'
                    : 'Paste a YouTube URL or select an example to begin'}
                </p>
              </div>
            )}
          </div>

          <div
            className="gallery-container mobile-gallery-container fade-in-up"
            style={{animationDelay: '0.6s'}}>
            {exampleGallery}
            <HistoryGallery
              history={history}
              onSelectItem={handleHistorySelect}
              onClearHistory={handleClearHistory}
            />
          </div>
        </div>
      </main>

      <style>{`
        .main-container {
          padding: 2rem;
          display: flex;
          gap: 2rem;
          height: 100vh;
          box-sizing: border-box;
          overflow: hidden;
        }

        .left-side {
          width: 40%;
          min-width: 400px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--color-accent) transparent;
          padding-right: 1rem;
        }

        .left-side::-webkit-scrollbar {
          width: 6px;
        }
        .left-side::-webkit-scrollbar-thumb {
          background-color: var(--color-accent);
          border-radius: 3px;
        }

        .right-side {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 1rem;
          height: 100%;
        }

        .header-content {
          text-align: center;
        }

        .headline {
          color: var(--color-text);
          font-family: var(--font-display);
          font-size: 2.5rem;
          letter-spacing: 2px;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 10px var(--color-accent);
        }

        .subtitle {
          color: var(--color-text-secondary);
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }

        .attribution {
          color: #888;
          font-family: var(--font-secondary);
          font-size: 0.9rem;
          font-style: italic;
        }

        .input-section {
          background: var(--color-background-secondary);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          position: relative;
        }

        .input-label {
          display: block;
          margin-bottom: 0.75rem;
          font-weight: bold;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 1px;
        }

        .input-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .youtube-input {
          flex: 1;
          width: 100%;
        }

        .error-message {
          color: var(--color-error);
          font-size: 0.9rem;
          padding: 0.75rem 1rem;
          margin-top: 1rem;
          border-radius: 6px;
          background-color: rgba(255, 71, 87, 0.1);
          border: 1px solid rgba(255, 71, 87, 0.3);
          animation: fade-in-up 0.3s ease-out, shake 0.5s ease-in-out 0.3s;
        }

        .submit-button {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          min-width: 120px;
        }

        .button-text {
          transition: opacity 0.2s ease;
        }

        .submit-button:disabled .button-text {
          opacity: 0.8;
        }

        .button-loader {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .video-container {
          background-color: var(--color-background-secondary);
          border-radius: 12px;
          color: var(--color-text-secondary);
          padding-top: 56.25%; /* 16:9 aspect ratio */
          position: relative;
          width: 100%;
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .video-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 12px;
        }

        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        .video-placeholder svg {
          color: var(--color-accent);
          opacity: 0.8;
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-height: 100%;
        }

        .content-placeholder {
          align-items: center;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          box-sizing: border-box;
          color: var(--color-text-secondary);
          display: flex;
          flex-direction: column;
          font-size: 1.2rem;
          height: 100%;
          justify-content: center;
          padding: 0 2rem;
          width: 100%;
          overflow: hidden;
          position: relative;
          background-color: var(--color-background-secondary);
        }

        .placeholder-grid {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          grid-template-rows: repeat(10, 1fr);
          gap: 1rem;
          padding: 2rem;
          opacity: 0.1;
        }

        .placeholder-dot {
          width: 4px;
          height: 4px;
          background-color: var(--color-accent);
          border-radius: 50%;
          animation: pulse-dot 2s infinite ease-in-out;
        }
        
        @keyframes pulse-dot {
          0%, 100% { transform: scale(0.5); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        
        .content-placeholder p {
          z-index: 1;
          background: var(--color-background-secondary);
          padding: 0.5rem 1rem;
          border-radius: 4px;
        }

        .gallery-container {
          width: 100%;
        }

        .desktop-gallery-container {
          display: block;
        }

        .mobile-gallery-container {
          display: none;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive styles */
        @media (max-width: 1200px) {
          .left-side {
            min-width: 320px;
            width: 35%;
          }
        }
        @media (max-width: 1024px) {
          .main-container {
            flex-direction: column;
            height: auto;
            overflow: visible;
          }
          .left-side,
          .right-side {
            width: 100%;
            height: auto;
            overflow: visible;
            padding-right: 0;
          }
          .content-area {
            min-height: 70vh;
          }
        }

        @media (max-width: 768px) {
          .main-container {
            padding: 1rem;
          }
          .headline {
            font-size: 1.8rem;
          }
          .subtitle {
            font-size: 1rem;
          }
          .desktop-gallery-container {
            display: none;
          }
          .mobile-gallery-container {
            display: block;
          }
          .input-row {
            flex-direction: column;
            align-items: stretch;
          }
          .submit-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}