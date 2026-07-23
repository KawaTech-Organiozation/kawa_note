import React from 'react';
import { Card } from "@/components/ui/card";
import { ExternalLink, Globe } from "lucide-react";

/**
 * URL Preview Card component - displays OpenGraph metadata
 * @param {Object} props
 * @param {Object} props.previewData - OpenGraph data
 * @param {string} props.url - Original URL
 * @param {'idle' | 'queued' | 'processing' | 'ready' | 'failed'} [props.status] - Metadata capture status
 * @returns {JSX.Element}
 */
export default function UrlPreviewCard({ previewData, url, status = 'ready' }) {
  if (!previewData && !url) return null;

  const {
    ogTitle,
    ogDescription,
    ogImage,
    title,
    description,
    image,
    ogSiteName,
    favicon,
    domain
  } = previewData || {};

  const resolvedTitle = ogTitle || title;
  const resolvedDescription = ogDescription || description;
  const resolvedImage = ogImage || image;

  return (
    <Card className="p-4 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="flex gap-4">
          {/* Image */}
          {resolvedImage && (
            <div className="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={resolvedImage}
                alt={resolvedTitle || 'Preview'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-4 h-4 mt-0.5 shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <Globe className="w-4 h-4 mt-0.5 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {ogSiteName || domain || new URL(url).hostname}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
            </div>

            {(resolvedTitle || status === 'queued' || status === 'processing') && (
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {resolvedTitle || (status === 'processing' ? 'Capturando metadados...' : 'Link salvo, preparando preview...')}
              </h4>
            )}

            {(resolvedDescription || status === 'queued' || status === 'processing' || status === 'failed') && (
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                {resolvedDescription || (
                  status === 'failed'
                    ? 'Nao foi possivel enriquecer este link automaticamente.'
                    : 'O link ja foi salvo e os metadados serao preenchidos em segundo plano.'
                )}
              </p>
            )}

            {!resolvedTitle && !resolvedDescription && status === 'ready' && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{url}</p>
            )}
          </div>
        </div>
      </a>
    </Card>
  );
}
