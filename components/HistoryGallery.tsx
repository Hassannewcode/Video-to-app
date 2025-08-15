/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {HistoryItem} from '@/lib/types';
import {useContext} from 'react';

interface HistoryGalleryProps {
  title?: string;
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

export default function HistoryGallery({
  title = 'History',
  history,
  onSelectItem,
  onClearHistory,
}: HistoryGalleryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="history-gallery">
        <div className="gallery-header">
          <h2 className="gallery-title">{title}</h2>
        </div>
        <div className="history-empty">
          <p>Your generated apps will appear here.</p>
        </div>
        <style>{`
        .history-gallery {
          width: 100%;
        }
        .gallery-header {
          margin-bottom: 1rem;
        }
        .gallery-title {
          color: var(--color-text);
          font-size: 1.5rem;
          font-weight: 600;
          padding-left: 0.5rem;
          border-left: 3px solid var(--color-accent-secondary);
          text-shadow: 0 0 5px var(--color-accent-secondary);
        }
        .history-empty {
          padding: 2rem 1rem;
          text-align: center;
          color: var(--color-text-secondary);
          border: 1px dashed var(--color-border);
          border-radius: 8px;
          margin-top: 1rem;
        }
      `}</style>
      </div>
    );
  }

  return (
    <div className="history-gallery">
      <div className="gallery-header">
        <h2 className="gallery-title">{title}</h2>
        <button onClick={onClearHistory} className="clear-button">
          Clear History
        </button>
      </div>
      <div className="history-list">
        {history.map((item) => (
          <div
            key={item.id}
            className="history-item"
            onClick={() => onSelectItem(item)}>
            <div className="history-item-title">{item.title}</div>
            <div className="history-item-timestamp">
              {new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .history-gallery {
          width: 100%;
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .gallery-title {
          color: var(--color-text);
          font-size: 1.5rem;
          font-weight: 600;
          padding-left: 0.5rem;
          border-left: 3px solid var(--color-accent-secondary);
          text-shadow: 0 0 5px var(--color-accent-secondary);
        }

        .clear-button {
          background: none;
          border: 1px solid var(--color-error);
          color: var(--color-error);
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-button:hover {
          background: var(--color-error);
          color: white;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .history-item {
          cursor: pointer;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease,
            border-color 0.3s ease;
          background-color: var(--color-background-secondary);
        }
        
        .history-item:hover {
          transform: translateY(-2px);
          border-color: var(--color-accent-secondary);
          box-shadow: 0 0 15px rgba(132, 60, 246, 0.4);
        }

        .history-item-title {
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 0.25rem;
          transition: color 0.3s ease;
        }

        .history-item:hover .history-item-title {
          color: var(--color-text);
        }

        .history-item-timestamp {
          font-size: 0.8rem;
          color: #888;
        }
      `}</style>
    </div>
  );
}