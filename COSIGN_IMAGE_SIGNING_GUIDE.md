# Container Image Signing with Cosign

**Supply Chain Security for Docker Images**

---

## 📊 Overview

This guide covers container image signing using Cosign (part of the Sigstore project). Image signing ensures the integrity and authenticity of container images throughout the software supply chain.

### What is Cosign?

- **Container image signing tool** from Sigstore
- **Cryptographic signatures** for container images
- **Supply chain security** verification
- **Open-source** and widely adopted
- **OCI-compliant** works with all registries

### Why Image Signing for Healthcare?

✅ **Verify image integrity** - Detect tampering
✅ **Supply chain security** - Prevent malicious images
✅ **Compliance requirements** - SOC 2, HIPAA, FDA
✅ **Audit trail** - Track image provenance
✅ **Zero-trust security** - Verify before deployment
✅ **Regulatory compliance** - FDA 21 CFR Part 11

---

## 🎯 Quick Start

### Prerequisites

```bash
# Install Cosign
brew install cosign  # macOS
# or
curl -sL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /usr/local/bin/cosign && chmod +x /usr/local/bin/cosign
# or
choco install cosign  # Windows

# Verify installation
cosign version
```

### Generate Key Pair

```bash
# Generate Cosign keys
./scripts/generate-cosign-keys.sh

# This creates:
#   - cosign.key (private key - KEEP SECRET)
#   - cosign.pub (public key - distribute freely)
```

### Add Keys to GitHub Secrets

```bash
# Via GitHub CLI
gh secret set COSIGN_PRIVATE_KEY < cosign.key
gh secret set COSIGN_PASSWORD  # Enter password when prompted
gh secret set COSIGN_PUBLIC_KEY < cosign.pub

# Via GitHub UI
# Settings → Secrets and variables → Actions → New repository secret
```

### Test the Setup

```bash
# Test locally
./scripts/test-cosign-signing.sh

# Deploy with signing
gh workflow run deploy-production.yml
```

---

## 🔑 Key Management

### Key Generation

The `generate-cosign-keys.sh` script creates a key pair:

**Private Key (cosign.key):**
- Used to sign images
- **MUST be kept secret**
- Password-protected
- Store in GitHub Secrets
- Backup in secure vault

**Public Key (cosign.pub):**
- Used to verify signatures
- Safe to distribute
- Can be committed to repo
- Share with team
- Distribute to users

### Key Storage

**DO:**
✅ Store private key in GitHub Secrets immediately
✅ Store password in password manager/vault
✅ Backup keys in secure location (1Password, HashiCorp Vault, etc.)
✅ Limit access to keys (least privilege)
✅ Rotate keys annually or if compromised
✅ Use separate keys for different environments

**DON'T:**
❌ Commit private keys to repository
❌ Share keys via email/Slack
❌ Store passwords in plain text
❌ Use same key across multiple projects
❌ Leave keys on local filesystem after setup

### Key Rotation

**When to rotate:**
- Annually (scheduled)
- Key compromise suspected
- Team member with key access leaves
- Security audit recommendation
- Compliance requirement

**How to rotate:**

```bash
# 1. Generate new key pair
./scripts/generate-cosign-keys.sh

# 2. Update GitHub Secrets
gh secret set COSIGN_PRIVATE_KEY < cosign.key
gh secret set COSIGN_PASSWORD
gh secret set COSIGN_PUBLIC_KEY < cosign.pub

# 3. Re-sign existing images
# See "Re-signing Images" section below

# 4. Securely delete old keys
shred -u old-cosign.key  # Linux
srm old-cosign.key       # macOS with srm
# or manually overwrite and delete
```

---

## 🔐 Signing Process

### Automatic Signing (CI/CD)

Images are automatically signed during deployment:

**Production Workflow:**
```yaml
# .github/workflows/deploy-production.yml
1. Build Docker image
2. Push to registry
3. Sign with Cosign (SHA tag + latest)
4. Verify signature
5. Deploy to production
```

**What gets signed:**
- Production images (main branch)
- Release tags
- All images pushed to registry

**Signature annotations:**
- `git-sha`: Git commit SHA
- `build-date`: Build timestamp
- `repo`: GitHub repository
- `workflow`: GitHub Actions workflow
- `environment`: Deployment environment

### Manual Signing

Sign an image manually:

```bash
# Sign a specific image
cosign sign --key cosign.key \
  --annotations "git-sha=$(git rev-parse HEAD)" \
  --annotations "signed-by=$(whoami)" \
  registry.digitalocean.com/your-registry/holi-labs:v1.0.0

# Verify signature
cosign verify --key cosign.pub \
  registry.digitalocean.com/your-registry/holi-labs:v1.0.0
```

### SBOM Attestation

Software Bill of Materials (SBOM) are also signed:

```bash
# Create and sign SBOM
cat > sbom.json <<EOF
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "components": [...]
}
EOF

cosign attest --key cosign.key \
  --predicate sbom.json \
  --type cyclonedx \
  registry.digitalocean.com/your-registry/holi-labs:v1.0.0

# Verify SBOM
cosign verify-attestation --key cosign.pub \
  --type cyclonedx \
  registry.digitalocean.com/your-registry/holi-labs:v1.0.0
```

---

## ✅ Signature Verification

### Automatic Verification

Signatures are automatically verified before deployment:

**Production Workflow:**
```yaml
1. Pull image from registry
2. Verify signature with public key
3. Check signature annotations
4. Fail deployment if verification fails
5. Proceed with deployment if verified
```

### Manual Verification

Verify an image signature:

```bash
# Basic verification
cosign verify --key cosign.pub \
  registry.digitalocean.com/your-registry/holi-labs:latest

# Verify with annotation requirements
cosign verify --key cosign.pub \
  --annotations "repo=holilabs/holilabsv2" \
  --annotations "environment=production" \
  registry.digitalocean.com/your-registry/holi-labs:latest

# Download and inspect signature
cosign download signature \
  registry.digitalocean.com/your-registry/holi-labs:latest \
  > signature.json

# View signature details
cat signature.json | jq '.[0].optional'
```

### Verification Policies

Create verification policies to enforce specific requirements:

```bash
# Create policy file
cat > cosign-policy.yaml <<EOF
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: holilabs-policy
spec:
  images:
    - glob: "registry.digitalocean.com/*/holi-labs:*"
  authorities:
    - key:
        data: |
          $(cat cosign.pub)
      annotations:
        - repo: "holilabs/holilabsv2"
        - environment: "production"
EOF

# Apply policy (if using admission controller)
kubectl apply -f cosign-policy.yaml
```

---

## 🏗️ Integration

### CI/CD Integration

Cosign is integrated into GitHub Actions workflows:

**Files Modified:**
- `.github/workflows/deploy-production.yml` - Added signing steps
- `.github/workflows/sign-and-verify-images.yml` - Reusable workflow

**Workflow Steps:**
1. **Build** - Docker image built
2. **Push** - Image pushed to registry
3. **Sign** - Image signed with Cosign
4. **Verify** - Signature verified
5. **Attest** - SBOM attestation created
6. **Deploy** - Image deployed to production

### Registry Integration

Works with all OCI-compliant registries:

**Supported Registries:**
- ✅ DigitalOcean Container Registry
- ✅ Docker Hub
- ✅ GitHub Container Registry (GHCR)
- ✅ AWS ECR
- ✅ Google Container Registry (GCR)
- ✅ Azure Container Registry (ACR)
- ✅ Harbor
- ✅ Quay.io

### Kubernetes Integration

Enforce signature verification in Kubernetes:

**Using Admission Controllers:**
```yaml
# Install Sigstore Policy Controller
kubectl apply -f https://github.com/sigstore/policy-controller/releases/latest/download/policy-controller.yaml

# Create policy
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: require-signed-images
spec:
  images:
    - glob: "registry.digitalocean.com/**"
  authorities:
    - key:
        data: |
          -----BEGIN PUBLIC KEY-----
          [Your cosign.pub content]
          -----END PUBLIC KEY-----
```

**Using OPA (Open Policy Agent):**
```rego
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  image := input.request.object.spec.containers[_].image
  not image_signed(image)
  msg := sprintf("Image %v is not signed", [image])
}

image_signed(image) {
  # Call cosign verify via webhook
  # Implementation depends on your setup
}
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Error: signing [image]: getting signer: reading key: invalid PEM block"

**Cause:** Private key file is corrupted or not in PEM format

**Solution:**
```bash
# Re-generate keys
./scripts/generate-cosign-keys.sh

# Ensure file has correct format
head -1 cosign.key  # Should show: -----BEGIN ENCRYPTED COSIGN PRIVATE KEY-----
```

#### 2. "Error: password incorrect"

**Cause:** Wrong password for private key

**Solution:**
```bash
# Verify password in GitHub Secrets
# Re-enter password carefully
gh secret set COSIGN_PASSWORD

# Test locally
COSIGN_PASSWORD=your-password cosign sign --key cosign.key test-image
```

#### 3. "Error: no matching signatures"

**Cause:** Image not signed or signature not found

**Solution:**
```bash
# Check if image is signed
cosign download signature image-name

# Re-sign image
cosign sign --key cosign.key image-name

# Verify signature exists
cosign verify --key cosign.pub image-name
```

#### 4. "Error: repository does not exist or may require 'docker login'"

**Cause:** Not authenticated to registry

**Solution:**
```bash
# DigitalOcean
doctl registry login

# Docker Hub
docker login

# GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

#### 5. "Error: MANIFEST_UNKNOWN: manifest unknown"

**Cause:** Image doesn't exist in registry

**Solution:**
```bash
# Verify image exists
docker pull image-name

# Push image if missing
docker push image-name

# Then sign
cosign sign --key cosign.key image-name
```

---

## 📋 Best Practices

### Development

```bash
Development:
  - Use test keys for local development
  - Don't use production keys locally
  - Test signing workflow before production
  - Verify signatures in CI/CD

Testing:
  - Run test script: ./scripts/test-cosign-signing.sh
  - Verify on staging before production
  - Test key rotation procedure
  - Document verification steps
```

### Production

```bash
Production:
  - Use separate keys per environment
  - Rotate keys annually
  - Monitor signature verification
  - Audit key access logs
  - Enforce verification policies

Security:
  - Never commit private keys
  - Use strong key passwords (20+ characters)
  - Store keys in secure vault
  - Limit key access (least privilege)
  - Enable 2FA on key storage
```

### Compliance

```bash
HIPAA:
  - Sign all production images
  - Verify before deployment
  - Audit trail of signatures
  - Documented key management

SOC 2:
  - Automated signature verification
  - Key rotation policy
  - Access control logs
  - Change management process

FDA 21 CFR Part 11:
  - Digital signatures for validation
  - Audit trail maintenance
  - Access control enforcement
  - Document all changes
```

---

## 📊 Monitoring

### Signature Metrics

Track these metrics:

```yaml
Monthly:
  - Images signed: Count
  - Verification failures: Count
  - Key rotations: Count
  - Unsigned deployments blocked: Count

Quarterly:
  - Key age: Days since generation
  - Signature coverage: Percentage
  - Verification performance: Milliseconds
  - Compliance status: Pass/Fail
```

### Alerts

Set up alerts for:

```bash
Critical:
  - Verification failure in production
  - Private key exposure suspected
  - Multiple verification failures

Warning:
  - Key approaching rotation date
  - Unsigned image deployed to staging
  - Signature verification slow (>5s)

Info:
  - New image signed
  - Key rotated successfully
  - Policy updated
```

### Audit Logging

Log all signature operations:

```bash
Events to Log:
  - Image signed (timestamp, image, user)
  - Signature verified (timestamp, image, result)
  - Key generated (timestamp, user)
  - Key rotated (timestamp, old key ID, new key ID)
  - Verification failed (timestamp, image, reason)

Retention:
  - Production logs: 7 years (HIPAA)
  - Staging logs: 1 year
  - Development logs: 30 days
```

---

## 🔬 Testing

### Local Testing

```bash
# Test complete workflow
./scripts/test-cosign-signing.sh

# Test specific image
./scripts/test-cosign-signing.sh nginx:latest

# Expected output:
#   ✅ Image pulled successfully
#   ✅ Image signed with Cosign
#   ✅ Signature verified
#   ✅ SBOM attestation created
#   ✅ SBOM attestation verified
```

### CI/CD Testing

```bash
# Trigger manual workflow
gh workflow run sign-and-verify-images.yml \
  -f image_ref=holi-labs:test \
  -f action=sign-and-verify

# View results
gh run list --workflow=sign-and-verify-images.yml

# Check logs
gh run view [run-id] --log
```

### Integration Testing

```bash
# Test in staging
1. Deploy to staging with signing
2. Verify signature in staging
3. Test application functionality
4. Confirm no regressions

# Test key rotation
1. Generate new key pair
2. Update GitHub Secrets
3. Deploy with new key
4. Verify old signatures still work
5. Re-sign images with new key
6. Delete old keys securely
```

---

## 📚 Resources

### Official Documentation

- [Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [Sigstore Project](https://www.sigstore.dev/)
- [Container Image Signing](https://github.com/sigstore/cosign)
- [Policy Controller](https://github.com/sigstore/policy-controller)

### Healthcare Compliance

- [FDA 21 CFR Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [SOC 2 Requirements](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html)

### Supply Chain Security

- [SLSA Framework](https://slsa.dev/)
- [NIST SSDF](https://csrc.nist.gov/Projects/ssdf)
- [CNCF Supply Chain Security](https://www.cncf.io/blog/2021/12/06/supply-chain-security-for-cloud-native-applications/)

---

## 🆘 Support

### Getting Help

```bash
# Check Cosign version
cosign version

# View Cosign help
cosign help
cosign sign --help
cosign verify --help

# GitHub Issues
# Label: security, cosign, supply-chain

# Team Support
# Email: security@holilabs.xyz
# Slack: #security
```

### Emergency Procedures

**If private key is compromised:**

1. **Immediate Actions:**
   ```bash
   # Rotate keys immediately
   ./scripts/generate-cosign-keys.sh

   # Update GitHub Secrets
   gh secret set COSIGN_PRIVATE_KEY < cosign.key
   gh secret set COSIGN_PASSWORD
   gh secret set COSIGN_PUBLIC_KEY < cosign.pub

   # Notify team
   # Document incident
   ```

2. **Follow-up Actions:**
   ```bash
   # Re-sign all production images
   # Revoke old key (if using transparency log)
   # Audit recent deployments
   # Update key management procedures
   # Schedule security review
   ```

3. **Post-Incident:**
   ```bash
   # Document timeline
   # Identify root cause
   # Implement preventive measures
   # Update runbooks
   # Train team
   ```

---

## ✅ Checklist

### Initial Setup

- [ ] Cosign installed
- [ ] Keys generated
- [ ] Keys added to GitHub Secrets
- [ ] Private key stored in vault
- [ ] Password stored in password manager
- [ ] Local test completed successfully
- [ ] CI/CD integration tested
- [ ] Team trained on procedures

### Before Each Release

- [ ] Images built successfully
- [ ] Images signed automatically
- [ ] Signatures verified in CI/CD
- [ ] SBOM attestations created
- [ ] No verification failures
- [ ] Deployment completed
- [ ] Post-deployment verification passed

### Monthly Maintenance

- [ ] Review signature metrics
- [ ] Check key expiration dates
- [ ] Audit signature logs
- [ ] Update documentation
- [ ] Test key rotation procedure
- [ ] Review access controls
- [ ] Verify backup procedures

---

**Status:** ✅ Production Ready
**Last Updated:** December 15, 2025
**Version:** 1.0.0
**Next Review:** Quarterly

---

**Get started now:**
```bash
./scripts/generate-cosign-keys.sh
./scripts/test-cosign-signing.sh
```
