# AWS Secrets Management - Best Practices Implemented

## ✅ Mejores Prácticas Aplicadas

### 1. AWS Secrets Manager (No SSM Parameter Store)
**Por qué:** Secrets Manager está diseñado específicamente para credenciales y ofrece:
- ✅ Rotación automática de passwords
- ✅ Encriptación en reposo y tránsito
- ✅ Auditoría completa con CloudTrail
- ✅ Integración nativa con RDS

**Antes (❌ No recomendado):**
```yaml
Parameters:
  DBPassword:
    Type: String
    NoEcho: true
```

**Después (✅ Best Practice):**
```yaml
RDSSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    GenerateSecretString:
      SecretStringTemplate: '{"username": "postgres"}'
      GenerateStringKey: 'password'
      PasswordLength: 32
      ExcludeCharacters: '"@/\'
      RequireEachIncludedType: true
```

### 2. Dynamic References (Versionless)
**Por qué:** Permite rotación automática sin cambios en el template

**Implementación:**
```yaml
MasterUsername: !Sub '{{resolve:secretsmanager:${RDSSecret}:SecretString:username}}'
MasterUserPassword: !Sub '{{resolve:secretsmanager:${RDSSecret}:SecretString:password}}'
```

**Beneficios:**
- ✅ No hardcoded passwords
- ✅ Soporta rotación automática
- ✅ Usa siempre la versión AWSCURRENT
- ✅ No requiere cambios en template al rotar

### 3. SecretTargetAttachment
**Por qué:** Vincula el secret con RDS para habilitar rotación automática

```yaml
SecretRDSAttachment:
  Type: AWS::SecretsManager::SecretTargetAttachment
  Properties:
    SecretId: !Ref RDSSecret
    TargetId: !Ref RDSInstance
    TargetType: AWS::RDS::DBInstance
```

### 4. Lambda Access via Secrets Manager
**Por qué:** Más seguro que variables de entorno

**Antes (❌):**
```python
# SSM Parameter Store
password = ssm.get_parameter(
    Name=RDS_PASSWORD_PARAM,
    WithDecryption=True
)['Parameter']['Value']
```

**Después (✅):**
```python
# Secrets Manager
secret_response = secretsmanager.get_secret_value(SecretId=RDS_SECRET_ARN)
secret = json.loads(secret_response['SecretString'])
username = secret['username']
password = secret['password']
```

### 5. IAM Permissions Mínimas
```yaml
Policies:
  - PolicyName: SecretsManagerAccess
    PolicyDocument:
      Statement:
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource: !Ref RDSSecret
```

## 🔐 Características de Seguridad

### Password Generation
- **Longitud**: 32 caracteres
- **Complejidad**: Mayúsculas, minúsculas, números, símbolos
- **Caracteres excluidos**: `"@/\` (evita problemas con URLs/SQL)
- **Generación**: Automática por AWS

### Encriptación
- **En reposo**: AWS KMS (default key)
- **En tránsito**: TLS 1.2+
- **Acceso**: Solo via IAM policies

### Auditoría
- **CloudTrail**: Todos los accesos registrados
- **CloudWatch**: Métricas de uso
- **Versioning**: Historial completo de cambios

## 🔄 Rotación Automática (Opcional)

Para habilitar rotación automática (30 días):

```yaml
RDSSecretRotationSchedule:
  Type: AWS::SecretsManager::RotationSchedule
  DependsOn: SecretRDSAttachment
  Properties:
    SecretId: !Ref RDSSecret
    RotationLambdaARN: !GetAtt RDSRotationLambda.Arn
    RotationRules:
      AutomaticallyAfterDays: 30
```

**Nota:** No implementado inicialmente para simplificar deployment.

## 📊 Comparación: SSM vs Secrets Manager

| Feature | SSM Parameter Store | Secrets Manager |
|---------|-------------------|-----------------|
| **Propósito** | Configuración general | Credenciales/secrets |
| **Rotación automática** | ❌ No | ✅ Sí |
| **Integración RDS** | ❌ Manual | ✅ Nativa |
| **Versioning** | ✅ Sí | ✅ Sí |
| **Costo** | Gratis (Standard) | $0.40/secret/mes |
| **Auditoría** | CloudTrail | CloudTrail + métricas |
| **Best practice para passwords** | ❌ No | ✅ Sí |

## 💰 Costo

**Secrets Manager:**
- $0.40/secret/mes
- $0.05 por 10,000 API calls

**Para nuestro caso:**
- 1 secret (RDS credentials): $0.40/mes
- ~1,000 API calls/mes: $0.005/mes
- **Total: ~$0.41/mes**

## 🚀 Deployment

El secret se crea automáticamente con el stack:

```bash
./infrastructure/scripts/deploy-optimized-stack.sh
```

CloudFormation:
1. Crea el secret con password aleatorio
2. Crea RDS usando dynamic reference
3. Vincula secret con RDS (SecretTargetAttachment)

## 🔍 Verificación

### Ver el secret
```bash
aws secretsmanager get-secret-value \
  --secret-id production/rds/master-credentials \
  --region us-east-1
```

### Ver metadata
```bash
aws secretsmanager describe-secret \
  --secret-id production/rds/master-credentials \
  --region us-east-1
```

### Rotar manualmente (si necesario)
```bash
aws secretsmanager rotate-secret \
  --secret-id production/rds/master-credentials \
  --region us-east-1
```

## 📚 Referencias AWS

- [Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [CloudFormation Dynamic References](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html)
- [RDS with Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-rds.html)

## ✅ Checklist de Seguridad

- [x] Passwords generados automáticamente
- [x] No hardcoded en código
- [x] No en variables de entorno
- [x] Encriptación en reposo (KMS)
- [x] Encriptación en tránsito (TLS)
- [x] IAM permissions mínimas
- [x] CloudTrail auditing habilitado
- [x] Dynamic references (versionless)
- [x] SecretTargetAttachment configurado
- [ ] Rotación automática (opcional, no implementado)

## 🎯 Resultado

**Seguridad mejorada con costo mínimo:**
- ✅ Best practices de AWS implementadas
- ✅ Listo para rotación automática
- ✅ Auditoría completa
- ✅ Costo: solo $0.41/mes adicional
