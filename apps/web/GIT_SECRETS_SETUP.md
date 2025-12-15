# Git-Secrets Setup Guide
**Prevent Hardcoded Secrets from Being Committed**

This guide will help you install and configure `git-secrets` to automatically detect and prevent hardcoded credentials from being committed to the repository.

---

## What is git-secrets?

`git-secrets` is a tool by AWS that:
- Scans commits, messages, and `--no-ff` merges
- Prevents you from committing passwords and other sensitive information
- Automatically checks for secrets before `git commit` and `git push`
- Can scan your entire git history for leaked secrets

**Project:** https://github.com/awslabs/git-secrets

---

## Installation

### macOS (via Homebrew)

```bash
# Install via Homebrew (recommended)
brew install git-secrets

# Verify installation
git secrets --version
```

### macOS/Linux (Manual Installation)

```bash
# Clone the repository
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets

# Install (requires sudo)
sudo make install

# Verify installation
git secrets --version
```

### Windows (via Git Bash)

```bash
# Clone the repository
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets

# Install (run as Administrator)
./install.sh

# Add to PATH
export PATH=$PATH:/usr/local/bin
```

---

## Setup for This Repository

### 1. Initialize git-secrets

Run these commands from the repository root:

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2

# Install hooks in this repository
git secrets --install

# This creates:
# - .git/hooks/commit-msg
# - .git/hooks/pre-commit
# - .git/hooks/prepare-commit-msg
```

**Expected Output:**
```
✓ Installed commit-msg hook to .git/hooks/commit-msg
✓ Installed pre-commit hook to .git/hooks/pre-commit
✓ Installed prepare-commit-msg hook to .git/hooks/prepare-commit-msg
```

---

### 2. Register AWS Patterns

Add built-in AWS credential patterns:

```bash
git secrets --register-aws
```

This adds patterns for:
- AWS Access Keys (AKIA...)
- AWS Secret Keys
- AWS Account IDs
- AWS ARNs

---

### 3. Add Custom Patterns for HoliLabs

Add patterns specific to this project:

```bash
# Anthropic API Keys
git secrets --add 'sk-ant-api03-[A-Za-z0-9_\-]+'

# OpenAI API Keys
git secrets --add 'sk-[A-Za-z0-9]{48}'

# Deepgram API Keys (32 hex characters)
git secrets --add '[0-9a-f]{32}'

# Twilio Account SID
git secrets --add 'AC[a-z0-9]{32}'

# Twilio Auth Token
git secrets --add '[a-z0-9]{32}'

# Resend API Keys
git secrets --add 're_[A-Za-z0-9_]+'

# Generic API Key patterns
git secrets --add 'api[_-]?key["\s:=]+"[a-zA-Z0-9_\-]+'
git secrets --add 'apikey["\s:=]+"[a-zA-Z0-9_\-]+'

# JWT Tokens
git secrets --add '["\']eyJ[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*["\']'

# Private Keys
git secrets --add -- '-----BEGIN.*PRIVATE KEY-----'

# Database URLs with passwords
git secrets --add 'postgresql://[a-zA-Z0-9_]+:[^@\s]+@'
git secrets --add 'mongodb(\+srv)?://[a-zA-Z0-9_]+:[^@\s]+@'

# Stripe Keys
git secrets --add 'sk_live_[a-zA-Z0-9]{24,}'
git secrets --add 'pk_live_[a-zA-Z0-9]{24,}'

# Generic secret/token patterns
git secrets --add 'SECRET["\s:=]+"[a-zA-Z0-9_\-]{16,}'
git secrets --add 'TOKEN["\s:=]+"[a-zA-Z0-9_\-]{16,}'
```

---

### 4. Add Allowed Patterns (Exceptions)

Some patterns might trigger false positives. Add exceptions:

```bash
# Allow example/placeholder keys
git secrets --add --allowed 'your-api-key-here'
git secrets --add --allowed 'your-.*-key-here'
git secrets --add --allowed 'sk-ant-api03-1234567890'  # Test fixture in encryption.ts
git secrets --add --allowed 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'  # Example in .env.example
git secrets --add --allowed 'example\.com'
git secrets --add --allowed 'localhost'

# Allow common test/mock patterns
git secrets --add --allowed 'test-api-key'
git secrets --add --allowed 'mock-.*'
git secrets --add --allowed 'fake-.*'

# Allow .env.example and other template files
git secrets --add --allowed '\.env\.example'
git secrets --add --allowed '\.env\..*\.example'
git secrets --add --allowed '\.template'
```

---

### 5. Test the Configuration

Test if git-secrets is working:

```bash
# Scan the current repository
git secrets --scan

# Scan specific files
git secrets --scan apps/web/.env.local

# Scan entire git history (WARNING: can be slow on large repos)
git secrets --scan-history
```

**Expected Output (if no secrets found):**
```
✓ No secrets found
```

**Expected Output (if secrets found):**
```
apps/web/.env.local:52:ANTHROPIC_API_KEY="sk-ant-api03-..."
[ERROR] Matched one or more prohibited patterns

Possible mitigations:
- Mark false positives as allowed using: git config --add secrets.allowed ...
- Mark false positives as allowed by adding regular expressions to .gitallowed at repository's root directory
- List your configured patterns: git config --get-all secrets.patterns
- List your configured allowed patterns: git config --get-all secrets.allowed
```

---

## Usage

### Automatic Protection (Pre-commit Hook)

Once installed, git-secrets runs automatically before every commit:

```bash
# Try to commit a file with a secret
git add .env.local
git commit -m "Add environment config"

# git-secrets will BLOCK the commit and show:
# [ERROR] Matched one or more prohibited patterns
# Commit rejected due to secrets detected
```

---

### Manual Scanning

Scan files before committing:

```bash
# Scan staged files
git secrets --scan

# Scan specific file
git secrets --scan path/to/file.ts

# Scan entire directory
git secrets --scan -r apps/web/src/

# Scan git history (finds historical leaks)
git secrets --scan-history
```

---

### Bypassing git-secrets (Emergency Only)

**WARNING:** Only use this if you're absolutely sure the flagged content is not a secret.

```bash
# Skip pre-commit hooks (NOT RECOMMENDED)
git commit --no-verify -m "Emergency commit"

# Or mark the pattern as allowed (better approach)
git secrets --add --allowed 'specific-false-positive-pattern'
```

---

## Global Setup (All Repositories)

Install git-secrets globally for all future repositories:

```bash
# Install hooks in global git template directory
git secrets --install ~/.git-templates/git-secrets

# Configure git to use this template
git config --global init.templateDir ~/.git-templates/git-secrets

# Register AWS patterns globally
git secrets --register-aws --global

# Add custom patterns globally
git secrets --add --global 'sk-ant-api03-[A-Za-z0-9_\-]+'
git secrets --add --global 're_[A-Za-z0-9_]+'
```

Now all new repositories will automatically have git-secrets enabled:

```bash
git init new-project
cd new-project
# git-secrets is already installed!
```

---

## Integration with Husky (Recommended)

If using Husky for git hooks, integrate git-secrets:

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky install

# Add git-secrets to pre-commit hook
npx husky add .husky/pre-commit "git secrets --scan"

# Make executable
chmod +x .husky/pre-commit
```

**File:** `.husky/pre-commit`
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run git-secrets before commit
git secrets --scan

# Run other checks (linting, tests, etc.)
npm run lint
```

---

## Configuration File

View current configuration:

```bash
# List all patterns
git config --get-all secrets.patterns

# List all allowed patterns
git config --get-all secrets.allowed

# List providers (AWS, etc.)
git config --get-all secrets.providers
```

**Location:** `.git/config` (repository-specific) or `~/.gitconfig` (global)

Example configuration:
```ini
[secrets]
  patterns = sk-ant-api03-[A-Za-z0-9_\\-]+
  patterns = re_[A-Za-z0-9_]+
  patterns = AC[a-z0-9]{32}
  allowed = your-api-key-here
  allowed = localhost
  providers = git secrets --aws-provider
```

---

## Alternative Tools

If git-secrets doesn't meet your needs, consider these alternatives:

### 1. Gitleaks (More Modern, Better Detection)

```bash
# Install
brew install gitleaks

# Scan repository
gitleaks detect --source . --verbose

# Scan and report
gitleaks detect --report-path report.json
```

**Pros:**
- Better detection (more patterns)
- Easier configuration (YAML)
- Better performance
- JSON/SARIF output

**Cons:**
- Requires separate installation
- More setup for pre-commit hooks

---

### 2. TruffleHog (Entropy-based Detection)

```bash
# Install
pip install truffleHog

# Scan repository
trufflehog --regex --entropy=True .
```

**Pros:**
- Detects high-entropy strings (random keys)
- Finds secrets without patterns

**Cons:**
- More false positives
- Slower on large repos

---

### 3. detect-secrets (Pre-commit Framework)

```bash
# Install
pip install detect-secrets

# Scan repository
detect-secrets scan > .secrets.baseline

# Pre-commit hook
detect-secrets-hook --baseline .secrets.baseline
```

**Pros:**
- Baseline system (track known secrets)
- Plugin architecture
- Good for large teams

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/security.yml`:

```yaml
name: Secret Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  scan-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for git-secrets

      - name: Install git-secrets
        run: |
          git clone https://github.com/awslabs/git-secrets.git
          cd git-secrets
          sudo make install

      - name: Configure git-secrets
        run: |
          git secrets --install
          git secrets --register-aws
          git secrets --add 'sk-ant-api03-[A-Za-z0-9_\-]+'
          git secrets --add 're_[A-Za-z0-9_]+'
          # Add more patterns...

      - name: Scan for secrets
        run: git secrets --scan-history
```

### Alternative: Use Gitleaks Action

```yaml
name: Secret Scanning

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Troubleshooting

### Issue: git-secrets not running on commit

**Solution:**
```bash
# Check if hooks are installed
ls -la .git/hooks/

# Reinstall hooks
git secrets --install -f
```

---

### Issue: Too many false positives

**Solution 1:** Add allowed patterns
```bash
git secrets --add --allowed 'false-positive-pattern'
```

**Solution 2:** Create `.gitallowed` file in repository root
```
# .gitallowed
your-api-key-here
localhost
example\.com
```

---

### Issue: Need to scan only new commits

**Solution:**
```bash
# Scan only uncommitted changes
git diff --cached --name-only | xargs git secrets --scan

# Scan specific commit range
git secrets --scan $(git rev-list HEAD~5..HEAD)
```

---

## Best Practices

1. **Install on Day 1** - Set up git-secrets before writing any code
2. **Team Onboarding** - Add git-secrets setup to developer onboarding docs
3. **CI/CD Integration** - Add secret scanning to PR checks
4. **Regular Audits** - Run `git secrets --scan-history` monthly
5. **Document Exceptions** - Keep track of allowed patterns and why
6. **Rotate Exposed Secrets** - If git-secrets finds a secret, rotate it immediately
7. **Review .gitignore** - Ensure sensitive files (.env.local) are gitignored

---

## Quick Reference

```bash
# Install
brew install git-secrets

# Setup repository
git secrets --install
git secrets --register-aws
git secrets --add 'pattern-to-block'
git secrets --add --allowed 'pattern-to-allow'

# Scan
git secrets --scan              # Scan staged changes
git secrets --scan-history      # Scan entire history

# List configuration
git secrets --list

# Remove pattern
git config --unset-all secrets.patterns 'pattern-to-remove'
```

---

## Resources

- **Official Repository:** https://github.com/awslabs/git-secrets
- **AWS Blog Post:** https://aws.amazon.com/blogs/security/how-to-use-git-secrets/
- **Alternative Tools:**
  - Gitleaks: https://github.com/gitleaks/gitleaks
  - TruffleHog: https://github.com/trufflesecurity/trufflehog
  - detect-secrets: https://github.com/Yelp/detect-secrets

---

## Next Steps

After setting up git-secrets:

1. Read: `SECURITY_AUDIT_HARDCODED_SECRETS.md` for current state
2. Follow: Immediate action items (revoke exposed keys)
3. Implement: Secret rotation schedule
4. Consider: Migrating to AWS Secrets Manager for production

---

**Setup Time:** 15-20 minutes
**Maintenance:** 5 minutes/month
**Protection:** Priceless

**Last Updated:** December 14, 2025
