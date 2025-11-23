# 📚 BUENAS PRÁCTICAS DE DEPLOY

**Lección aprendida:** 23 de Noviembre, 2025  
**Contexto:** Deploy de features frontend-backend

---

## ✅ CHECKLIST COMPLETO DE DEPLOY

### 1. ANTES DE COMMITEAR

- [ ] **Verificar cambios locales**
  ```bash
  git status
  git diff
  ```

- [ ] **Revisar archivos modificados**
  - Entender QUÉ cambió
  - Entender POR QUÉ cambió
  - Verificar que no hay cambios accidentales

- [ ] **Verificar que no hay errores**
  ```bash
  npm run build
  npm run lint
  npm run type-check
  ```

- [ ] **Testing local**
  ```bash
  npm run dev
  # Probar features manualmente
  ```

---

### 2. COMMITS Y GIT

- [ ] **Commits atómicos y descriptivos**
  ```bash
  git add <archivos-relacionados>
  git commit -m "feat: descripción clara del cambio"
  ```

- [ ] **Mensajes de commit claros**
  - `feat:` - Nueva feature
  - `fix:` - Bug fix
  - `docs:` - Documentación
  - `chore:` - Mantenimiento
  - `refactor:` - Refactorización
  - `test:` - Tests

- [ ] **Push a remote**
  ```bash
  git push origin main
  ```

---

### 3. VERIFICACIÓN DE DEPLOY

- [ ] **Verificar que el push fue exitoso**
  ```bash
  git log --oneline -5
  git status
  ```

- [ ] **Monitorear auto-deploy**
  - Abrir Vercel Dashboard
  - Verificar que el build inició
  - Esperar a que complete (~2-3 min)
  - Verificar que no hay errores

- [ ] **Verificar deployment URL**
  ```bash
  # Verificar que el sitio responde
  curl -I https://tu-proyecto.vercel.app
  ```

- [ ] **Verificar logs**
  ```bash
  vercel logs --follow
  ```

---

### 4. TESTING EN PRODUCCIÓN

- [ ] **Smoke testing**
  - Abrir sitio en browser
  - Verificar que carga
  - Verificar que no hay errores en console
  - Probar flujo principal

- [ ] **Feature testing**
  - Probar cada feature nueva
  - Verificar que funciona como esperado
  - Probar edge cases
  - Probar en mobile

- [ ] **Regression testing**
  - Verificar que features existentes siguen funcionando
  - Verificar que no se rompió nada
  - Probar flujos críticos

---

### 5. MONITOREO POST-DEPLOY

- [ ] **Verificar métricas**
  - Error rate
  - Response time
  - User engagement
  - Bounce rate

- [ ] **Verificar logs**
  - Errores de JavaScript
  - Errores de API
  - Warnings
  - Performance issues

- [ ] **Verificar analytics**
  - Page views
  - User behavior
  - Conversion rate
  - Feature adoption

---

## 🎯 BUENAS PRÁCTICAS ESPECÍFICAS

### Deploy Seguro

1. **Branch Strategy**
   ```bash
   # Desarrollo en feature branch
   git checkout -b feature/nueva-feature
   
   # Testing en feature branch
   npm run test
   
   # Merge a main solo cuando está listo
   git checkout main
   git merge feature/nueva-feature
   
   # Push a producción
   git push origin main
   ```

2. **Rollback Plan**
   ```bash
   # Si algo sale mal, rollback inmediato
   vercel rollback
   
   # O revert commit
   git revert HEAD
   git push origin main
   ```

3. **Environment Variables**
   - Verificar en Vercel Dashboard
   - No commitear secrets
   - Usar .env.example como template

---

### Documentación

1. **Documentar cambios**
   - Crear CHANGELOG.md
   - Actualizar README.md
   - Crear docs de features nuevas

2. **Documentar deploy**
   - Crear DEPLOY-VERIFICATION.md
   - Listar features deployadas
   - Listar testing pendiente

3. **Documentar issues**
   - Crear issues en GitHub
   - Documentar bugs encontrados
   - Documentar mejoras futuras

---

### Comunicación

1. **Notificar al equipo**
   - Deploy completado
   - Features nuevas
   - Breaking changes
   - Testing pendiente

2. **Solicitar feedback**
   - Pedir que prueben
   - Recopilar comentarios
   - Iterar basado en feedback

---

## 🚨 ERRORES COMUNES A EVITAR

### ❌ NO HACER

1. **Push sin verificar**
   ```bash
   # ❌ MAL
   git add .
   git commit -m "fix"
   git push
   ```

2. **Deploy sin testing**
   - No probar localmente
   - No verificar build
   - No verificar en staging

3. **Ignorar errores**
   - Errores en console
   - Warnings en build
   - Errores en logs

4. **No monitorear**
   - No verificar deploy completó
   - No verificar sitio funciona
   - No verificar logs

5. **No documentar**
   - No crear docs
   - No actualizar README
   - No comunicar cambios

---

### ✅ SÍ HACER

1. **Verificar antes de push**
   ```bash
   # ✅ BIEN
   git status
   git diff
   npm run build
   npm run test
   git add <archivos>
   git commit -m "feat: descripción clara"
   git push origin main
   ```

2. **Monitorear deploy**
   - Abrir Vercel Dashboard
   - Verificar build completa
   - Verificar sitio funciona
   - Verificar logs

3. **Testing completo**
   - Testing local
   - Testing en staging
   - Testing en producción
   - Regression testing

4. **Documentar todo**
   - Cambios en código
   - Features nuevas
   - Deploy process
   - Issues encontrados

---

## 📋 TEMPLATE DE DEPLOY

```markdown
# Deploy: [Feature Name]

**Fecha:** [Fecha]
**Branch:** main
**Commits:** [Lista de commits]

## Features Deployadas
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

## Verificación
- [ ] Build exitoso
- [ ] Deploy completado
- [ ] Sitio accesible
- [ ] Features funcionan
- [ ] No errores en logs

## Testing
- [ ] Smoke testing
- [ ] Feature testing
- [ ] Regression testing
- [ ] Mobile testing

## Monitoreo
- [ ] Métricas normales
- [ ] No errores nuevos
- [ ] Performance OK
- [ ] Users satisfechos

## Issues Encontrados
- Ninguno / [Lista de issues]

## Próximos Pasos
- [Lista de próximos pasos]
```

---

## 🎓 LECCIONES APRENDIDAS

### De este deploy específico:

1. ✅ **Siempre verificar git status antes de push**
   - Había cambios en `recommend/route.ts` sin commitear
   - El autofix de Kiro modificó el archivo
   - Necesitaba commitear antes de considerar deploy completo

2. ✅ **Verificar deploy en Vercel**
   - No basta con push a GitHub
   - Verificar que Vercel auto-deploy completó
   - Verificar que sitio funciona en producción

3. ✅ **Crear scripts de verificación**
   - `check-vercel-deploy.sh` para automatizar
   - `DEPLOY-VERIFICATION.md` para checklist
   - Facilita verificación futura

4. ✅ **Documentar proceso**
   - Crear docs de implementación
   - Crear docs de deploy
   - Facilita onboarding y debugging

---

## 🚀 CONCLUSIÓN

**Deploy NO está completo hasta que:**

1. ✅ Código está en GitHub (main branch)
2. ✅ Vercel auto-deploy completó exitosamente
3. ✅ Sitio funciona en producción
4. ✅ Features fueron probadas manualmente
5. ✅ No hay errores en logs
6. ✅ Métricas son normales
7. ✅ Equipo fue notificado
8. ✅ Documentación está actualizada

**Memorizado:** ✅ Siempre seguir este checklist completo

---

**Documento creado:** 23 de Noviembre, 2025  
**Propósito:** Guía de referencia para futuros deploys  
**Status:** ✅ Lección aprendida y documentada

