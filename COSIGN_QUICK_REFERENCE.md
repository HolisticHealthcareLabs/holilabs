# Cosign Image Signing - Quick Reference

**One-page guide for container image signing**

---

## 🚀 Quick Commands

### Setup

```bash
# Install Cosign
brew install cosign              # macOS
# or download from: https://github.com/sigstore/cosign/releases

# Generate keys
./scripts/generate-cosign-keys.sh

# Add to GitHub Secrets
gh secret set COSIGN_PRIVATE_KEY < cosign.key
gh secret set COSIGN_PASSWORD
gh secret set COSIGN_PUBLIC_KEY < cosign.pub

# Test setup
./scripts/test-cosign-signing.sh
```

### Sign Images

```bash
# Sign with key
cosign sign --key cosign.key \
  --annotations "git-sha=$(git rev-parse HEAD)" \
  image:tag

# Sign with SBOM
cosign attest --key cosign.key \
  --predicate sbom.json \
  --type cyclonedx \
  image:tag
```

### Verify Images

```bash
# Verify signature
cosign verify --key cosign.pub image:tag

# Verify with annotations
cosign verify --key cosign.pub \
  --annotations "repo=holilabs/holilabsv2" \
  image:tag

# Download signature
cosign download signature image:tag > signature.json

# Verify attestation
cosign verify-attestation --key cosign.pub \
  --type cyclonedx \
  image:tag
```

---

## 📊 Workflow Integration

### Automatic Signing (Production)

```yaml
Production Deployment Flow:
  1. Build Docker image
  2. Push to registry
  3. Sign with Cosign (SHA + latest tags)
  4. Verify signature
  5. Deploy to production
```

**What's signed:**
- All production images (main branch)
- Both SHA and latest tags
- SBOM attestations included

**Signature annotations:**
- `git-sha`: Commit SHA
- `build-date`: Build timestamp
- `repo`: GitHub repository
- `workflow`: Workflow name
- `environment`: prod/staging/dev

### Manual Trigger

```bash
# Via GitHub UI
Actions → Sign and Verify Images → Run workflow

# Via CLI
gh workflow run sign-and-verify-images.yml \
  -f image_ref=holi-labs:v1.0.0 \
  -f action=sign-and-verify
```

---

## 🔑 Key Management

### Key Files

| File | Purpose | Storage |
|------|---------|---------|
| `cosign.key` | Private key (sign) | GitHub Secrets + Vault |
| `cosign.pub` | Public key (verify) | GitHub Secrets + Repo |

### GitHub Secrets

```bash
Required Secrets:
  - COSIGN_PRIVATE_KEY  (entire cosign.key content)
  - COSIGN_PASSWORD     (key password)
  - COSIGN_PUBLIC_KEY   (entire cosign.pub content)
```

### Key Rotation

```bash
When to rotate:
  ✅ Annually (scheduled)
  ✅ Key compromise suspected
  ✅ Team member leaves
  ✅ Security audit requires

How to rotate:
  1. Generate new keys: ./scripts/generate-cosign-keys.sh
  2. Update GitHub Secrets
  3. Re-sign existing images (optional)
  4. Securely delete old keys
```

---

## 🔍 Common Operations

### Sign Existing Image

```bash
# Pull image
docker pull registry.digitalocean.com/myregistry/holi-labs:v1.0.0

# Sign it
cosign sign --key cosign.key \
  registry.digitalocean.com/myregistry/holi-labs:v1.0.0

# Verify
cosign verify --key cosign.pub \
  registry.digitalocean.com/myregistry/holi-labs:v1.0.0
```

### Re-sign Multiple Images

```bash
# List all images
doctl registry repository list-tags holi-labs

# Sign each
for tag in $(doctl registry repository list-tags holi-labs --format Tag --no-header); do
  echo "Signing holi-labs:$tag"
  cosign sign --key cosign.key \
    registry.digitalocean.com/myregistry/holi-labs:$tag
done
```

### Check Signature Status

```bash
# Download and inspect
cosign download signature image:tag | jq '.[0].optional'

# Expected output:
{
  "git-sha": "abc123...",
  "build-date": "2025-12-15T10:00:00Z",
  "repo": "holilabs/holilabsv2",
  "workflow": "Deploy to Production"
}
```

---

## 🛠️ Troubleshooting

### Common Errors

| Error | Solution |
|-------|----------|
| "password incorrect" | Check COSIGN_PASSWORD in secrets |
| "no matching signatures" | Image not signed, run sign command |
| "invalid PEM block" | Re-generate keys |
| "MANIFEST_UNKNOWN" | Push image to registry first |
| "repository does not exist" | Login to registry: `doctl registry login` |

### Quick Fixes

```bash
# Reset and start fresh
./scripts/generate-cosign-keys.sh
gh secret set COSIGN_PRIVATE_KEY < cosign.key
gh secret set COSIGN_PASSWORD
gh secret set COSIGN_PUBLIC_KEY < cosign.pub
./scripts/test-cosign-signing.sh

# Verify registry access
doctl registry login
docker pull registry.digitalocean.com/myregistry/holi-labs:latest

# Check signature exists
cosign download signature image:tag
```

---

## 📋 Verification Commands

### Basic Verification

```bash
# Simple verify
cosign verify --key cosign.pub image:tag

# Verify with policy
cosign verify --key cosign.pub \
  --annotations "environment=production" \
  image:tag

# Verify SBOM
cosign verify-attestation --key cosign.pub \
  --type cyclonedx \
  image:tag
```

### Advanced Verification

```bash
# Extract signature metadata
cosign download signature image:tag \
  | jq '.[0].optional'

# Verify signature chain
cosign verify --key cosign.pub \
  --check-claims=true \
  image:tag

# Verify with certificate
cosign verify \
  --certificate-identity="user@example.com" \
  --certificate-oidc-issuer="https://accounts.google.com" \
  image:tag
```

---

## 🔐 Security Best Practices

### DO

✅ **Store keys securely**
- Private key in GitHub Secrets + vault
- Password in password manager
- Backup keys in secure location

✅ **Rotate keys regularly**
- Annually or as needed
- After team changes
- If compromise suspected

✅ **Verify before deployment**
- All production images
- Fail deployment if verification fails
- Log all verification attempts

✅ **Monitor signatures**
- Track signing metrics
- Alert on verification failures
- Audit key access

### DON'T

❌ Commit private keys to repo
❌ Share keys via email/Slack
❌ Use same key across projects
❌ Skip verification in production
❌ Ignore verification failures

---

## 📊 Monitoring

### Key Metrics

```yaml
Daily:
  - Images signed: Count
  - Verifications passed: Count
  - Verification failures: Count

Weekly:
  - Signature coverage: Percentage
  - Unsigned images: Count
  - Key age: Days

Monthly:
  - Key rotation due: Boolean
  - Compliance status: Pass/Fail
```

### Alerts

```bash
Critical:
  🚨 Verification failure in production
  🚨 Private key exposure suspected
  🚨 Multiple verification failures

Warning:
  ⚠️ Key rotation approaching (30 days)
  ⚠️ Unsigned image in staging
  ⚠️ Slow verification (>5s)
```

---

## 🎯 Integration Points

### CI/CD

```yaml
Workflows:
  - deploy-production.yml   (automatic signing)
  - deploy-staging.yml      (automatic signing)
  - sign-and-verify-images.yml (reusable)

Steps Added:
  1. Install Cosign
  2. Sign images (post-push)
  3. Verify signatures (pre-deploy)
  4. Generate summary
```

### Container Registry

```bash
Supported:
  ✅ DigitalOcean Container Registry
  ✅ Docker Hub
  ✅ GitHub Container Registry
  ✅ AWS ECR
  ✅ Google GCR
  ✅ Azure ACR
```

### Kubernetes (Optional)

```bash
# Install Policy Controller
kubectl apply -f https://github.com/sigstore/policy-controller/releases/latest/download/policy-controller.yaml

# Require signed images
kubectl apply -f cosign-policy.yaml
```

---

## 📚 Quick Links

| Resource | Link |
|----------|------|
| **Full Guide** | `COSIGN_IMAGE_SIGNING_GUIDE.md` |
| **Cosign Docs** | https://docs.sigstore.dev/cosign/overview/ |
| **Generate Keys** | `./scripts/generate-cosign-keys.sh` |
| **Test Setup** | `./scripts/test-cosign-signing.sh` |
| **Workflow** | `.github/workflows/sign-and-verify-images.yml` |

---

## ✅ Pre-Deployment Checklist

Before deploying with signed images:

- [ ] Cosign installed locally
- [ ] Keys generated
- [ ] COSIGN_PRIVATE_KEY in GitHub Secrets
- [ ] COSIGN_PASSWORD in GitHub Secrets
- [ ] COSIGN_PUBLIC_KEY in GitHub Secrets
- [ ] Private key backed up securely
- [ ] Password stored in password manager
- [ ] Local test passed (`./scripts/test-cosign-signing.sh`)
- [ ] CI/CD test passed (staging)
- [ ] Team trained on procedures
- [ ] Documentation reviewed
- [ ] Emergency procedures documented

---

## 🆘 Emergency Procedures

### Key Compromised

```bash
Immediate:
  1. Generate new keys: ./scripts/generate-cosign-keys.sh
  2. Update GitHub Secrets immediately
  3. Notify security team
  4. Document incident

Follow-up:
  5. Re-sign all production images
  6. Audit recent deployments
  7. Review access logs
  8. Update procedures
```

### Verification Failures

```bash
Investigate:
  1. Check image exists and is accessible
  2. Verify key matches (public key correct?)
  3. Check signature exists: cosign download signature
  4. Review signing logs in CI/CD
  5. Test with known-good image

Resolve:
  6. Re-sign if needed
  7. Update keys if rotated
  8. Check registry permissions
  9. Verify network connectivity
```

---

## 🎓 Training

### For Developers

**Must know:**
1. What image signing is
2. How to verify signatures locally
3. When images get signed
4. What to do if verification fails

**Commands to know:**
```bash
cosign verify --key cosign.pub image:tag
cosign download signature image:tag
./scripts/test-cosign-signing.sh
```

### For DevOps/SRE

**Must know:**
1. How to generate and rotate keys
2. How to troubleshoot signing issues
3. How to add keys to GitHub Secrets
4. Emergency procedures

**Commands to know:**
```bash
./scripts/generate-cosign-keys.sh
gh secret set COSIGN_PRIVATE_KEY < cosign.key
cosign sign --key cosign.key image:tag
cosign verify --key cosign.pub image:tag
```

---

**Status:** ✅ Production Ready
**Last Updated:** December 15, 2025
**Version:** 1.0.0

**Get started:**
```bash
./scripts/generate-cosign-keys.sh
```

**Print this page and keep it near your desk for quick reference!**
