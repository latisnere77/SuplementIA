/**
 * Share Referral Card Component
 * Social share buttons and referral tracking
 * Growth-optimized
 */

'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail, Twitter } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface ShareReferralCardProps {
  recommendationId: string;
  referralLink?: string;
  onShare?: (platform: string) => void;
}

export default function ShareReferralCard({
  recommendationId,
  referralLink,
  onShare,
}: ShareReferralCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareLink = referralLink || (typeof window !== 'undefined' ? `${window.location.origin}/portal/results?id=${recommendationId}` : '');
  const shareText = t('share.text') || `Check out this evidence-based health recommendation I found!`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onShare) onShare('copy');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareLink}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShare) onShare('whatsapp');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Evidence-Based Health Recommendation');
    const body = encodeURIComponent(`${shareText}\n\n${shareLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    if (onShare) onShare('email');
  };

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShare) onShare('twitter');
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Share2 className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{t('share.title')}</h3>
          <p className="text-sm text-gray-600">{t('share.subtitle')}</p>
        </div>
      </div>

      {/* Referral Incentive */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-blue-200">
        <p className="text-sm font-medium text-gray-900 mb-1">{t('share.referral.rewards')}</p>
        <p className="text-xs text-gray-600">
          {t('share.referral.desc')}
        </p>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button
          onClick={handleWhatsApp}
          className="flex flex-col items-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="text-sm">{t('share.whatsapp')}</span>
        </button>

        <button
          onClick={handleEmail}
          className="flex flex-col items-center gap-2 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Mail className="h-6 w-6" />
          <span className="text-sm">{t('share.email')}</span>
        </button>

        <button
          onClick={handleTwitter}
          className="flex flex-col items-center gap-2 p-4 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
        >
          <Twitter className="h-6 w-6" />
          <span className="text-sm">{t('share.twitter')}</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex flex-col items-center gap-2 p-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          {copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
          <span className="text-sm">{copied ? t('share.copied') : t('share.copy')}</span>
        </button>
      </div>

      {/* Link Display */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-600 mb-1">{t('share.link.label')}</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={shareLink}
            readOnly
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

