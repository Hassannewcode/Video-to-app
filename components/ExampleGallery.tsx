/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {DataContext} from '@/context';
import {Example} from '@/lib/types';
import {useContext} from 'react';

interface ExampleGalleryProps {
  title?: string;
  selectedExample: Example | null;
  onSelectExample: (example: Example) => void;
}

export default function ExampleGallery({
  title = 'Examples',
  selectedExample,
  onSelectExample,
}: ExampleGalleryProps) {
  const getThumbnailUrl = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
  };

  const {examples} = useContext(DataContext);

  return (
    <div className="example-gallery">
      <h2 className="gallery-title">{title}</h2>
      <div className="gallery-grid">
        {examples.map((example) => (
          <div
            key={example.title}
            className={`gallery-item ${
              selectedExample?.title === example.title ? 'selected' : ''
            }`}
            onClick={() => onSelectExample(example)}>
            <div className="thumbnail-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getThumbnailUrl(example.url)}
                alt={example.title}
                className="thumbnail"
              />
              <div className="play-icon-overlay">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="gallery-item-title">{example.title}</div>
          </div>
        ))}
      </div>

      <style>{`
        .example-gallery {
          width: 100%;
        }

        .gallery-title {
          color: var(--color-text);
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          padding-left: 0.5rem;
          border-left: 3px solid var(--color-accent);
          text-shadow: 0 0 5px var(--color-accent);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .gallery-item {
          cursor: pointer;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease,
            border-color 0.3s ease;
          background-color: var(--color-background-secondary);
        }

        .gallery-item:hover,
        .gallery-item.selected {
          transform: translateY(-5px);
          border-color: var(--color-accent);
          box-shadow: var(--shadow-glow-intense);
        }

        .gallery-item:hover .thumbnail {
          transform: scale(1.05);
        }

        .gallery-item-title {
          align-items: center;
          display: flex;
          flex-grow: 1;
          font-size: 0.9rem;
          font-weight: 500;
          justify-content: center;
          padding: 0.75rem;
          text-align: center;
          color: var(--color-text-secondary);
          background-color: rgba(0, 0, 0, 0.2);
          transition: color 0.3s ease;
        }

        .gallery-item:hover .gallery-item-title,
        .gallery-item.selected .gallery-item-title {
          color: var(--color-text);
        }

        .thumbnail-container {
          position: relative;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          overflow: hidden;
        }

        .thumbnail {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .play-icon-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 2;
        }

        .gallery-item:hover .play-icon-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}