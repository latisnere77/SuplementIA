'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const FAQ_ITEMS = [
  // General
  { id: 'what_is', category: 'general' },
  { id: 'is_free', category: 'general' },

  // Science
  { id: 'source_studies', category: 'science' },
  { id: 'grades_meaning', category: 'science' },
  { id: 'what_is_rct', category: 'science' },
  { id: 'missing_info', category: 'science' },

  // Products
  { id: 'why_products', category: 'products' },
  { id: 'affiliate_disclosure', category: 'products' },
  { id: 'what_is_ankonere', category: 'products' },

  // Safety
  { id: 'trust_recommendations', category: 'safety' },
  { id: 'safety_warning', category: 'safety' },
  { id: 'adverse_reaction', category: 'safety' },
  { id: 'verify_products', category: 'safety' },
] as const;

const CATEGORIES = {
  general: { icon: '💬', color: 'blue' },
  science: { icon: '🔬', color: 'purple' },
  products: { icon: '📦', color: 'green' },
  safety: { icon: '🛡️', color: 'red' },
};

export default function FAQSection() {
  const t = useTranslations('faq');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = selectedCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter(faq => faq.category === selectedCategory);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <HelpCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-600">{t('subtitle')}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === 'all'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          {t('categories.all')}
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${selectedCategory === key
                ? `bg-${cat.color}-500 text-white shadow-md`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <span>{cat.icon}</span>
            <span>{t(`categories.${key}` as any)}</span>
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        {filteredFAQs.map((faq) => {
          const isOpen = openItems.has(faq.id);
          const category = CATEGORIES[faq.category as keyof typeof CATEGORIES];
          const question = t(`questions.${faq.id}.question` as any);
          const answer = t(`questions.${faq.id}.answer` as any);

          return (
            <div
              key={faq.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
            >
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full flex items-start justify-between gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {t(`categories.${faq.category}` as any)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {question}
                  </h3>
                </div>
                <div className="flex-shrink-0 mt-1">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact CTA */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>{t('contact.text')}</strong>
          {' '}
          <a
            href="mailto:support@suplementai.com"
            className="text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            support@suplementai.com
          </a>
          {' '}{t('contact.help')}
        </p>
      </div>
    </div>
  );
}
