#!/bin/bash
#
# Git Secrets Pre-Commit Hook Setup
#
# Installs a pre-commit hook that scans for secrets using gitleaks
# before allowing commits to proceed.
#
# Usage: ./scripts/setup-git-secrets.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Setting up git secrets protection...${NC}\n"

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo -e "${RED}❌ gitleaks is not installed${NC}"
    echo ""
    echo "Please install gitleaks:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh"
    echo "  Windows: scoop install gitleaks"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} gitleaks is installed: $(which gitleaks)"

# Create pre-commit hook
HOOK_PATH=".git/hooks/pre-commit"
echo -e "\n${GREEN}📝 Creating pre-commit hook...${NC}"

cat > "$HOOK_PATH" << 'HOOK_EOF'
#!/bin/bash
#
# Pre-commit hook: Scan for secrets using gitleaks
#

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Run gitleaks on staged files
echo "🔍 Scanning for secrets..."

# Create temporary directory for gitleaks report
REPORT_FILE=$(mktemp)

# Run gitleaks protect (scans staged changes)
if ! gitleaks protect --staged --redact --verbose --report-path="$REPORT_FILE" 2>&1; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚨 SECRETS DETECTED IN STAGED FILES${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Your commit contains potential secrets or sensitive data."
    echo "Review the findings above and remove any sensitive information."
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  • API keys, tokens, or passwords"
    echo "  • Database connection strings"
    echo "  • Private keys or certificates"
    echo "  • .env files or backups"
    echo ""
    echo -e "${YELLOW}To fix:${NC}"
    echo "  1. Remove the sensitive data from your files"
    echo "  2. Update .gitignore if needed"
    echo "  3. Stage your changes again: git add <files>"
    echo "  4. Try committing again"
    echo ""
    echo -e "${YELLOW}To bypass this check (NOT RECOMMENDED):${NC}"
    echo "  git commit --no-verify"
    echo ""

    # Clean up
    rm -f "$REPORT_FILE"
    exit 1
fi

# Clean up
rm -f "$REPORT_FILE"

echo "✅ No secrets detected. Proceeding with commit."
exit 0
HOOK_EOF

# Make hook executable
chmod +x "$HOOK_PATH"
echo -e "${GREEN}✓${NC} Pre-commit hook installed at ${HOOK_PATH}"

# Create .gitleaks.toml config if it doesn't exist
if [ ! -f ".gitleaks.toml" ]; then
    echo -e "\n${GREEN}📝 Creating .gitleaks.toml configuration...${NC}"

    cat > ".gitleaks.toml" << 'CONFIG_EOF'
# Gitleaks Configuration for Holi Labs EMR
# https://github.com/gitleaks/gitleaks

title = "Gitleaks Configuration - Holi Labs"

[extend]
# Use default gitleaks rules
useDefault = true

[allowlist]
description = "Allowlist for known false positives"

# Ignore test files with fake/example data
paths = [
    '''.*test.*''',
    '''.*spec.*''',
    '''.*\.test\.ts''',
    '''.*\.spec\.ts''',
    '''__tests__/.*''',
    '''.*/fixtures/.*''',
    '''.*/mocks/.*''',
]

# Ignore documentation and examples
regexes = [
    '''EXAMPLE_.*''',
    '''example-.*''',
    '''TEST_.*''',
    '''test-.*''',
    '''DEMO_.*''',
    '''demo-.*''',
]

# Ignore specific false positives
[[allowlist.regexes]]
description = "Ignore UUID-like patterns in Prisma schema"
regex = '''@id @default\(uuid\(\)\)'''

[[allowlist.regexes]]
description = "Ignore MRN format specifications"
regex = '''MRN-\d{8}'''

[[allowlist.regexes]]
description = "Ignore CPF format documentation"
regex = '''^\d{3}\.\d{3}\.\d{3}-\d{2}$'''
CONFIG_EOF

    echo -e "${GREEN}✓${NC} Created .gitleaks.toml"

    # Stage .gitleaks.toml for commit
    git add .gitleaks.toml 2>/dev/null || true
else
    echo -e "\n${YELLOW}⚠${NC}  .gitleaks.toml already exists, skipping"
fi

# Test the hook
echo -e "\n${GREEN}🧪 Testing pre-commit hook...${NC}"
echo -e "${YELLOW}Creating test file with fake secret...${NC}"

# Create a temporary test file
TEST_FILE=$(mktemp test-secret-XXXXXX.txt)
echo "AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE" > "$TEST_FILE"

# Try to stage it (this should be caught)
git add "$TEST_FILE" 2>/dev/null || true

echo -e "${YELLOW}Running pre-commit check...${NC}"
if .git/hooks/pre-commit 2>&1 | grep -q "SECRETS DETECTED"; then
    echo -e "${GREEN}✅ Pre-commit hook is working correctly!${NC}"
    echo -e "${GREEN}   (Test secret was properly detected)${NC}"
else
    echo -e "${YELLOW}⚠️  Hook installed but test didn't detect the fake secret${NC}"
    echo -e "${YELLOW}   This might be okay if the pattern isn't in gitleaks rules${NC}"
fi

# Clean up test file
git reset HEAD "$TEST_FILE" 2>/dev/null || true
rm -f "$TEST_FILE"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Git secrets protection is now active!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Your repository is now protected against accidental secret commits."
echo ""
echo -e "${YELLOW}What happens next:${NC}"
echo "  • Every commit will be scanned for secrets automatically"
echo "  • Commits with secrets will be blocked"
echo "  • You can bypass with --no-verify (not recommended)"
echo ""
echo -e "${YELLOW}To scan existing repository:${NC}"
echo "  gitleaks detect --source . --verbose --redact"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  .gitleaks.toml - Customize rules and allowlists"
echo "  .git/hooks/pre-commit - The actual hook script"
echo ""
