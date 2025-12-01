# AWS Free Tier en Organizations: La Verdad Completa

## 🚨 Respuesta Directa

**NO, cada cuenta nueva en una Organization NO obtiene su propio Free Tier.**

### Regla Oficial de AWS:

> **"For AWS Organizations, the AWS Free Tier eligibility for all member accounts begins on the day that the management account is created."**
> 
> — AWS Documentation

---

## 📋 Cómo Funciona Realmente

### Escenario 1: Organization Existente
```
Management Account (creada hace 2 años)
├── Member Account A (creada hoy)
├── Member Account B (creada hoy)
└── Member Account C (creada hoy)

Free Tier Status:
❌ Management Account: Expiró hace 1 año (12 meses después de creación)
❌ Member Account A: NO tiene Free Tier (usa fecha de Management Account)
❌ Member Account B: NO tiene Free Tier (usa fecha de Management Account)
❌ Member Account C: NO tiene Free Tier (usa fecha de Management Account)
```

**Todas las cuentas comparten la misma fecha de inicio del Free Tier: la fecha de creación de la Management Account.**

---

### Escenario 2: Organization Nueva
```
Management Account (creada HOY)
├── Member Account A (creada HOY)
├── Member Account B (creada mañana)
└── Member Account C (creada en 1 mes)

Free Tier Status:
✅ Management Account: 12 meses desde HOY
✅ Member Account A: 12 meses desde HOY (no desde su creación)
✅ Member Account B: 12 meses desde HOY (no desde mañana)
✅ Member Account C: 12 meses desde HOY (no desde dentro de 1 mes)

Todas expiran: HOY + 12 meses
```

---

## 💰 Consolidated Billing: Cómo se Suman los Límites

### Free Tier Limits se COMPARTEN entre todas las cuentas:

```
Ejemplo: Lambda Free Tier
- Límite: 1M requests/mes
- 400K GB-seconds/mes

Organization con 3 cuentas:
Account A: 500K requests → OK
Account B: 300K requests → OK
Account C: 300K requests → ❌ EXCEDE (total: 1.1M)

Resultado: Pagas por 100K requests extras
```

### Tipos de Free Tier:

#### 1. **12 Months Free** (se comparte)
- EC2: 750 horas/mes t2.micro
- RDS: 750 horas/mes db.t2.micro
- S3: 5GB storage
- Lambda: 1M requests/mes

**Todas las cuentas en la Organization comparten estos límites.**

#### 2. **Always Free** (se comparte también)
- Lambda: 1M requests/mes (permanente)
- DynamoDB: 25GB storage, 25 WCU, 25 RCU
- CloudWatch: 10 custom metrics

**También se suman entre todas las cuentas.**

#### 3. **Short-term Trials** (por cuenta)
- SageMaker: 250 horas/mes por 2 meses
- Comprehend Medical: 25K units/mes por 12 meses

**Estos SÍ son independientes por cuenta.**

---

## 🎯 Estrategia: ¿Cómo Maximizar Free Tier?

### ❌ NO Funciona: Crear múltiples cuentas en Organization
```
Organization:
├── Account A (OpenSearch)
├── Account B (Lambda)
└── Account C (DynamoDB)

Free Tier: Se comparte entre todas
Resultado: NO ganas nada
```

### ✅ SÍ Funciona: Cuentas INDEPENDIENTES (sin Organization)

```
Account A (email1@domain.com) → Free Tier independiente
Account B (email2@domain.com) → Free Tier independiente
Account C (email3@domain.com) → Free Tier independiente

Cada una tiene:
- 12 meses desde su creación
- Límites completos independientes
```

**PERO:**
- ❌ Viola AWS Terms of Service (abuse)
- ❌ AWS puede detectar y banear todas las cuentas
- ❌ Requiere emails diferentes
- ❌ Tarjetas de crédito diferentes
- ❌ No puedes usar consolidated billing

---

## 💡 Implicaciones para tu Arquitectura

### Arquitectura 2: AWS Serverless ML ($170/mes)

Si usas Organization:
```
OpenSearch Serverless: $70/mes (NO free tier)
Bedrock: $35/mes (NO free tier después de 12 meses)
Lambda: $0 (Always Free, pero compartido)
DynamoDB: $0 (Always Free, pero compartido)

Total: $105/mes (después de 12 meses)
```

### Arquitectura 3.5: True Serverless ($19/mes)

Si usas Organization:
```
Vercel Postgres: $0 (no es AWS)
Cloudflare Workers: $0-5 (no es AWS)
Redis Upstash: $0-10 (no es AWS)
Lambda: $0 (Always Free compartido)
DynamoDB: $0 (Always Free compartido)

Total: $0-19/mes (permanente, no depende de Free Tier)
```

---

## 🏆 Recomendación Final

### Para Startups:

**Usa servicios que NO dependan del Free Tier de 12 meses:**

1. **Vercel Postgres** (no AWS) → Free tier permanente
2. **Cloudflare Workers** (no AWS) → Free tier permanente
3. **Upstash Redis** (no AWS) → Free tier permanente
4. **AWS Lambda** → Always Free (permanente)
5. **AWS DynamoDB** → Always Free (permanente)

### Evita:
- ❌ OpenSearch (no free tier, $70/mes mínimo)
- ❌ Bedrock (free tier solo 12 meses)
- ❌ EC2 (free tier solo 12 meses)
- ❌ RDS (free tier solo 12 meses)

---

## 📊 Comparación Real de Costos

| Servicio | Free Tier | Después de 12 meses | En Organization |
|----------|-----------|---------------------|-----------------|
| **Lambda** | 1M req/mes | 1M req/mes (Always) | Compartido |
| **DynamoDB** | 25GB + 25 WCU/RCU | 25GB + 25 WCU/RCU (Always) | Compartido |
| **OpenSearch** | ❌ No existe | $70/mes | $70/mes |
| **EC2 t2.micro** | 750h/mes | $8.50/mes | Compartido |
| **RDS db.t2.micro** | 750h/mes | $15/mes | Compartido |
| **Bedrock** | 3 meses trial | $35/mes | Compartido |

---

## 🎓 Conclusión

**Para tu caso de uso (supplement discovery):**

1. **NO crees múltiples cuentas AWS** esperando múltiples Free Tiers
2. **USA Arquitectura 3.5** (True Serverless) que NO depende de Free Tier temporal
3. **Enfócate en servicios "Always Free"** (Lambda, DynamoDB)
4. **Complementa con servicios no-AWS** (Vercel, Cloudflare, Upstash)

**Resultado: $0-19/mes permanente, sin depender de Free Tier de 12 meses.**
