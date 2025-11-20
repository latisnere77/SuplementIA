#!/bin/bash
# Script simple para commit y push

cd /Users/latisnere/documents/suplementia

echo "🔧 Limpiando locks..."
rm -f .git/index.lock .git/COMMIT_EDITMSG.lock

echo "📁 Agregando archivos..."
git add backend/lambda/studies-fetcher/
git add backend/lambda/content-enricher/deploy-simple.sh
git add -f app/api/portal/studies/route.ts
git add -f components/portal/ScientificStudiesPanel.tsx
git add -f lib/portal/autocomplete-suggestions-fuzzy.ts
git add -f app/api/portal/autocomplete/route.ts
git add IMPLEMENTATION_SUMMARY.md END_TO_END_TEST_RESULTS.md AUTOCOMPLETE_PUBMED_FALLBACK.md

echo "💾 Haciendo commit..."
git commit -m "feat: estudios científicos + autocomplete inteligente" \
  -m "🤖 Generated with Claude Code"

if [ $? -eq 0 ]; then
    echo "✅ Commit exitoso"
    echo ""
    echo "🚀 Haciendo push..."
    git push

    if [ $? -eq 0 ]; then
        echo "✅ Push exitoso!"
        git log --oneline -1
    else
        echo "❌ Error en push"
    fi
else
    echo "❌ Error en commit"
fi
