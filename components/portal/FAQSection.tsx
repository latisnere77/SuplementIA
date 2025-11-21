'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'science' | 'products' | 'safety';
}

const FAQ_DATA: FAQItem[] = [
  // General
  {
    category: 'general',
    question: '¿Qué es SuplementAI?',
    answer: 'SuplementAI es una plataforma que analiza estudios científicos de PubMed para proporcionarte recomendaciones de suplementos basadas en evidencia real. No inventamos información, solo analizamos investigaciones publicadas y verificables.',
  },
  {
    category: 'general',
    question: '¿Es gratuito?',
    answer: 'Sí, ofrecemos un plan gratuito que te permite realizar búsquedas básicas. El plan Pro ofrece acceso a todas las opciones de productos, análisis más profundos, y sin límites de búsqueda.',
  },

  // Science
  {
    category: 'science',
    question: '¿De dónde vienen los estudios científicos?',
    answer: 'Todos los estudios provienen de PubMed, la base de datos de investigación biomédica más grande del mundo, mantenida por el National Institutes of Health (NIH) de Estados Unidos. Contiene más de 35 millones de artículos científicos revisados por pares.',
  },
  {
    category: 'science',
    question: '¿Qué significan las calificaciones A, B, C?',
    answer: 'Las calificaciones reflejan la calidad de la evidencia científica:\n\n• Grado A: Evidencia sólida de múltiples estudios RCT (ensayos controlados aleatorios) y meta-análisis\n• Grado B: Evidencia moderada de algunos estudios RCT\n• Grado C: Evidencia limitada, principalmente estudios observacionales\n\nBasamos estas calificaciones en el número, calidad y consistencia de los estudios disponibles.',
  },
  {
    category: 'science',
    question: '¿Qué es un RCT (Randomized Controlled Trial)?',
    answer: 'Un RCT (Ensayo Controlado Aleatorio) es el estándar de oro en investigación científica. Los participantes se asignan aleatoriamente a dos grupos: uno recibe el suplemento y otro recibe un placebo. Esto elimina sesgos y permite determinar si el suplemento realmente funciona.',
  },
  {
    category: 'science',
    question: '¿Por qué algunos suplementos no tienen información?',
    answer: 'Si no encontramos información sobre un suplemento, puede ser porque:\n\n1. El nombre está mal escrito (intenta con variaciones)\n2. Es un producto muy nuevo sin estudios publicados\n3. No existen estudios científicos en PubMed sobre ese compuesto\n4. Es un nombre comercial (intenta buscar con el nombre del ingrediente activo)\n\nNunca generamos información falsa. Si no hay estudios, te lo decimos claramente.',
  },

  // Products
  {
    category: 'products',
    question: '¿Por qué recomiendan estos productos específicos?',
    answer: 'Las recomendaciones de productos NO están basadas en publicidad o comisiones especiales. Mostramos:\n\n• Opción Económica: Productos básicos accesibles\n• Opción de Valor: Mejor relación calidad-precio\n• Opción Premium: Formulaciones optimizadas (como ANKONERE)\n\nTodas las opciones contienen los mismos ingredientes activos respaldados por la ciencia.',
  },
  {
    category: 'products',
    question: '¿Ganan dinero con los enlaces de productos?',
    answer: 'Sí, somos transparentes al respecto. Algunos enlaces son de afiliados, lo que significa que podemos recibir una pequeña comisión si compras a través de ellos (sin costo adicional para ti). Esto nos permite mantener el servicio gratuito y seguir mejorando la plataforma.',
  },
  {
    category: 'products',
    question: '¿Qué es ANKONERE?',
    answer: 'ANKONERE es nuestra línea premium de suplementos formulados específicamente para el mercado latinoamericano, con dosificaciones optimizadas basadas en la evidencia científica que analizamos. Es una opción, no una obligación.',
  },

  // Safety
  {
    category: 'safety',
    question: '¿Puedo confiar en las recomendaciones?',
    answer: 'Nuestras recomendaciones están basadas EXCLUSIVAMENTE en estudios científicos publicados y revisados por pares. Sin embargo, NO somos un sustituto del consejo médico profesional. Siempre debes consultar con un médico o profesional de salud antes de tomar cualquier suplemento.',
  },
  {
    category: 'safety',
    question: '¿Es seguro tomar estos suplementos?',
    answer: 'Los suplementos que aparecen en nuestras recomendaciones han sido estudiados en investigaciones científicas y generalmente se consideran seguros para la mayoría de las personas en las dosis indicadas. Sin embargo:\n\n• Pueden interactuar con medicamentos\n• Pueden no ser seguros durante el embarazo/lactancia\n• Pueden tener efectos secundarios\n• Las dosis individuales varían\n\n¡SIEMPRE consulta con un profesional de salud antes de tomar suplementos!',
  },
  {
    category: 'safety',
    question: '¿Qué pasa si tengo una reacción adversa?',
    answer: 'Si experimentas cualquier reacción adversa:\n\n1. Suspende inmediatamente el suplemento\n2. Consulta a un médico lo antes posible\n3. Reporta la reacción a las autoridades sanitarias de tu país\n\nNo somos responsables de reacciones adversas. Los suplementos, aunque naturales, pueden tener efectos secundarios.',
  },
  {
    category: 'safety',
    question: '¿Verifican la calidad de los productos que recomiendan?',
    answer: 'No. No analizamos físicamente los productos ni verificamos su calidad en laboratorio. Recomendamos que compres suplementos de marcas reconocidas que:\n\n• Tengan certificaciones de terceros (USP, NSF, etc.)\n• Muestren transparencia en ingredientes\n• Tengan buena reputación en el mercado\n• Cumplan con regulaciones locales',
  },
];

const CATEGORIES = {
  general: { name: 'General', icon: '💬', color: 'blue' },
  science: { name: 'Ciencia', icon: '🔬', color: 'purple' },
  products: { name: 'Productos', icon: '📦', color: 'green' },
  safety: { name: 'Seguridad', icon: '🛡️', color: 'red' },
};

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = selectedCategory === 'all'
    ? FAQ_DATA
    : FAQ_DATA.filter(faq => faq.category === selectedCategory);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <HelpCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preguntas Frecuentes</h2>
          <p className="text-sm text-gray-600">Todo lo que necesitas saber sobre SuplementAI</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedCategory === key
                ? `bg-${cat.color}-500 text-white shadow-md`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        {filteredFAQs.map((faq, index) => {
          const isOpen = openItems.has(index);
          const category = CATEGORIES[faq.category];

          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-start justify-between gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {category.name}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {faq.question}
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
                    {faq.answer}
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
          <strong>¿No encontraste lo que buscabas?</strong>
          {' '}Contáctanos en{' '}
          <a
            href="mailto:support@suplementai.com"
            className="text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            support@suplementai.com
          </a>
          {' '}y te ayudaremos.
        </p>
      </div>
    </div>
  );
}
