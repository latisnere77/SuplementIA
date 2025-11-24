/**
 * Guides & Categories Section
 * Sección para página principal con categorías de salud y guías
 * Diseño tipo cards con iconos y colores llamativos
 */

'use client';

import { Brain, Heart, Zap, Moon, Dumbbell, ShieldCheck, Smile, Leaf, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface HealthCategory {
  id: string;
  name: string;
  nameEs: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  descriptionEs: string;
  popularSupplements: string[];
  href: string;
}

const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    id: 'cognitive',
    name: 'Cognitive Health',
    nameEs: 'Salud Cognitiva',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200 hover:border-purple-400',
    description: 'Memory, focus, and mental clarity',
    descriptionEs: 'Memoria, enfoque y claridad mental',
    popularSupplements: ['Ashwagandha', 'Omega-3', 'Bacopa'],
    href: '/portal/results?q=cognitive',
  },
  {
    id: 'heart',
    name: 'Heart Health',
    nameEs: 'Salud Cardiovascular',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200 hover:border-red-400',
    description: 'Blood pressure and cardiovascular function',
    descriptionEs: 'Presión arterial y función cardiovascular',
    popularSupplements: ['Omega-3', 'CoQ10', 'Magnesio'],
    href: '/portal/results?q=heart',
  },
  {
    id: 'energy',
    name: 'Energy & Vitality',
    nameEs: 'Energía y Vitalidad',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200 hover:border-yellow-400',
    description: 'Boost energy and reduce fatigue',
    descriptionEs: 'Aumenta la energía y reduce la fatiga',
    popularSupplements: ['Creatina', 'Vitamina B12', 'Hierro'],
    href: '/portal/results?q=energy',
  },
  {
    id: 'sleep',
    name: 'Sleep Quality',
    nameEs: 'Calidad del Sueño',
    icon: Moon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    description: 'Better sleep and recovery',
    descriptionEs: 'Mejor sueño y recuperación',
    popularSupplements: ['Melatonina', 'Magnesio', 'Valeriana'],
    href: '/portal/results?q=sleep',
  },
  {
    id: 'muscle',
    name: 'Muscle & Fitness',
    nameEs: 'Músculo y Fitness',
    icon: Dumbbell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200 hover:border-orange-400',
    description: 'Build muscle and improve performance',
    descriptionEs: 'Construye músculo y mejora el rendimiento',
    popularSupplements: ['Creatina', 'Proteína Whey', 'Beta-Alanina'],
    href: '/portal/results?q=muscle',
  },
  {
    id: 'immune',
    name: 'Immune Support',
    nameEs: 'Sistema Inmune',
    icon: ShieldCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200 hover:border-green-400',
    description: 'Strengthen your immune system',
    descriptionEs: 'Fortalece tu sistema inmune',
    popularSupplements: ['Vitamina D', 'Zinc', 'Vitamina C'],
    href: '/portal/results?q=immune',
  },
  {
    id: 'mood',
    name: 'Mood & Stress',
    nameEs: 'Ánimo y Estrés',
    icon: Smile,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200 hover:border-pink-400',
    description: 'Manage stress and improve mood',
    descriptionEs: 'Maneja el estrés y mejora el ánimo',
    popularSupplements: ['Ashwagandha', 'Rhodiola', 'L-Teanina'],
    href: '/portal/results?q=stress',
  },
  {
    id: 'longevity',
    name: 'Longevity & Anti-Aging',
    nameEs: 'Longevidad y Anti-Edad',
    icon: Leaf,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    description: 'Support healthy aging',
    descriptionEs: 'Apoya el envejecimiento saludable',
    popularSupplements: ['Resveratrol', 'NAD+', 'Colágeno'],
    href: '/portal/results?q=longevity',
  },
];

interface GuidesCategoriesProps {
  title?: string;
  subtitle?: string;
  maxCategories?: number;
}

/**
 * Sección de categorías de salud para la página principal
 */
export default function GuidesCategories({
  title,
  subtitle,
  maxCategories,
}: GuidesCategoriesProps) {
  const router = useRouter();
  const { t, language } = useTranslation();

  const categories = maxCategories
    ? HEALTH_CATEGORIES.slice(0, maxCategories)
    : HEALTH_CATEGORIES;

  const handleCategoryClick = (href: string) => {
    router.push(href);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title || (language === 'es' ? 'Explora por Categoría' : 'Explore by Category')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle || (language === 'es'
              ? 'Encuentra suplementos basados en evidencia para tus objetivos de salud'
              : 'Find evidence-based supplements for your health goals')}
          </p>
        </div>

        {/* Grid de categorías */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const categoryName = language === 'es' ? category.nameEs : category.name;
            const categoryDesc = language === 'es' ? category.descriptionEs : category.description;

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.href)}
                className={`
                  group relative rounded-xl border-2 p-6 text-left transition-all
                  ${category.bgColor} ${category.borderColor}
                  hover:shadow-lg hover:-translate-y-1
                `}
              >
                {/* Icono */}
                <div className={`inline-flex p-3 rounded-lg mb-4 ${category.bgColor} border-2 ${category.borderColor}`}>
                  <Icon className={`h-6 w-6 ${category.color}`} />
                </div>

                {/* Título */}
                <h3 className={`text-xl font-bold mb-2 ${category.color}`}>
                  {categoryName}
                </h3>

                {/* Descripción */}
                <p className="text-sm text-gray-600 mb-4">
                  {categoryDesc}
                </p>

                {/* Suplementos populares */}
                <div className="space-y-1 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    {language === 'es' ? 'Populares' : 'Popular'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {category.popularSupplements.slice(0, 3).map((supp) => (
                      <span
                        key={supp}
                        className="text-xs px-2 py-1 rounded-full bg-white border border-gray-200"
                      >
                        {supp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow (hover) */}
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className={category.color}>
                    {language === 'es' ? 'Ver más' : 'Learn more'}
                  </span>
                  <ArrowRight className={`h-4 w-4 ${category.color} group-hover:translate-x-1 transition-transform`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Ver todas las categorías (si hay maxCategories) */}
        {maxCategories && HEALTH_CATEGORIES.length > maxCategories && (
          <div className="text-center mt-12">
            <button
              onClick={() => router.push('/portal/categories')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {language === 'es' ? 'Ver Todas las Categorías' : 'View All Categories'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
