/**
 * Share Referral Card Component
 * Social share buttons and referral tracking
 * Growth-optimized
 */

'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail, Twitter, Facebook, Linkedin } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  // Get supplement name from URL or page
  const supplementName = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('q') || 'suplementos'
    : 'suplementos';

  const shareLink = referralLink || (typeof window !== 'undefined' ? `${window.location.origin}/portal/results?id=${recommendationId}` : '');

  // Improved share texts in Spanish
  const shareTexts = {
    whatsapp: `🔬 Descubrí información científica verificada sobre ${supplementName}\n\n✅ Basado en estudios de PubMed\n✅ Evidencia real y verificable\n\nMíralo aquí:`,
    twitter: `🔬 Información científica verificada sobre ${supplementName} | Basado en estudios de PubMed`,
    email: `🔬 Información Científica sobre ${supplementName}\n\nHola,\n\nEncontré esta información respaldada por estudios científicos de PubMed sobre ${supplementName}.\n\nLa plataforma analiza investigaciones reales y proporciona recomendaciones basadas en evidencia.\n\nPuedes verlo aquí:`,
    default: `🔬 Descubrí información científica sobre ${supplementName} basada en estudios de PubMed`,
  };

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
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareTexts.whatsapp} ${shareLink}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShare) onShare('whatsapp');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Información Científica sobre ${supplementName}`);
    const body = encodeURIComponent(`${shareTexts.email}\n\n${shareLink}\n\n---\nEnviado desde SuplementAI - Recomendaciones basadas en evidencia científica`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    if (onShare) onShare('email');
  };

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTexts.twitter)}&url=${encodeURIComponent(shareLink)}&hashtags=SuplementAI,CienciaBasadaEnEvidencia`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShare) onShare('twitter');
  };

  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShare) onShare('facebook');
  };

  const handleLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onShare) onShare('linkedin');
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
      <div className="space-y-3 mb-4">
        {/* Primary Share Buttons (Most Popular) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 p-4 min-h-[44px] bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-md"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">WhatsApp</span>
          </button>

          <button
            onClick={handleTwitter}
            className="flex items-center justify-center gap-2 p-4 min-h-[44px] bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-md"
          >
            <Twitter className="h-5 w-5" />
            <span className="text-sm">Twitter</span>
          </button>
        </div>

        {/* Secondary Share Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleFacebook}
            className="flex items-center justify-center gap-2 p-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:scale-105"
          >
            <Facebook className="h-5 w-5" />
            <span className="text-xs">Facebook</span>
          </button>

          <button
            onClick={handleLinkedIn}
            className="flex items-center justify-center gap-2 p-3 min-h-[44px] bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium transition-all hover:scale-105"
          >
            <Linkedin className="h-5 w-5" />
            <span className="text-xs">LinkedIn</span>
          </button>

          <button
            onClick={handleEmail}
            className="flex items-center justify-center gap-2 p-3 min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all hover:scale-105"
          >
            <Mail className="h-5 w-5" />
            <span className="text-xs">Email</span>
          </button>
        </div>
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
            className="px-4 py-3 min-h-[44px] min-w-[44px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

