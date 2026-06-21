#!/bin/bash

# ============================================================================
# Deployment Script - Version 2.1.0 (Session Tracking)
# ============================================================================
# Description: Automated deployment script for session tracking feature
# Date: June 21, 2026
# Usage: ./scripts/deploy-v2.1.0.sh [staging|production]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="v2.1.0"
ENVIRONMENT="${1:-staging}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
echo "============================================================================"
echo "  🚀 Deployment Script - Version $VERSION"
echo "  Environment: $ENVIRONMENT"
echo "  Date: $(date)"
echo "============================================================================"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment. Use: staging or production"
    exit 1
fi

# Step 1: Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" ]]; then
    log_error "Must be on 'main' branch for production deployment. Current: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    log_warning "You have uncommitted changes:"
    git status -s
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment cancelled"
        exit 1
    fi
fi

# Step 2: Run tests
log_info "Running TypeScript type check..."
if npm run type-check 2>/dev/null; then
    log_success "Type check passed"
else
    log_warning "Type check failed or not configured"
fi

# Step 3: Build
log_info "Building application..."
if npm run build; then
    log_success "Build completed successfully"
else
    log_error "Build failed"
    exit 1
fi

# Step 4: Database migration reminder
echo ""
log_warning "⚠️  IMPORTANT: Database Migration Required"
echo "-------------------------------------------"
echo "Before deploying, ensure you've run the migration:"
echo ""
echo "  psql -h [host] -U [user] -d [db] -f supabase/migrations/051_add_session_tracking.sql"
echo ""
read -p "Have you run the database migration? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Please run the database migration first"
    exit 1
fi

# Step 5: Git tagging (production only)
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating git tag: $VERSION"
    
    if git rev-parse "$VERSION" >/dev/null 2>&1; then
        log_warning "Tag $VERSION already exists"
    else
        git tag -a "$VERSION" -m "Session tracking release - $VERSION"
        log_success "Tag created: $VERSION"
    fi
fi

# Step 6: Deploy
echo ""
log_info "Starting deployment to $ENVIRONMENT..."

if [[ "$ENVIRONMENT" == "production" ]]; then
    # Production deployment
    log_info "Pushing to main branch..."
    git push origin main
    
    log_info "Pushing tags..."
    git push origin "$VERSION"
    
    log_success "Code pushed to production!"
    echo ""
    echo "🎉 Deployment initiated!"
    echo ""
    echo "Next steps:"
    echo "1. Monitor Vercel deployment: https://vercel.com/dashboard"
    echo "2. Verify deployment: https://your-domain.com"
    echo "3. Test session tracking feature"
    echo "4. Monitor error logs"
    
else
    # Staging deployment
    log_info "Deploying to staging..."
    git push origin "$CURRENT_BRANCH"
    
    log_success "Code pushed to staging!"
    echo ""
    echo "🧪 Staging deployment initiated!"
    echo ""
    echo "Test the following:"
    echo "1. Login from Device A"
    echo "2. Login from Device B with same account"
    echo "3. Verify Device A is logged out"
    echo "4. Check session validation runs every 30s"
fi

# Step 7: Post-deployment checklist
echo ""
echo "============================================================================"
echo "  ✅ Post-Deployment Checklist"
echo "============================================================================"
echo ""
echo "[ ] 1. Verify deployment is live"
echo "[ ] 2. Test login/logout functionality"
echo "[ ] 3. Test multi-device login scenario"
echo "[ ] 4. Check error logs for issues"
echo "[ ] 5. Monitor API response times"
echo "[ ] 6. Verify session validation works"
echo "[ ] 7. Test on mobile devices"
echo "[ ] 8. Update team on deployment status"
echo ""

# Step 8: Monitoring links
echo "============================================================================"
echo "  📊 Monitoring & Logs"
echo "============================================================================"
echo ""
echo "Deployment: https://vercel.com/dashboard"
echo "Application: https://your-domain.com"
echo "Database: https://supabase.com/dashboard"
echo "Errors: Check Sentry (if configured)"
echo ""

# Final message
echo "============================================================================"
log_success "Deployment script completed!"
echo "============================================================================"
echo ""

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🎊 Congratulations! Version $VERSION is now in production!"
else
    echo "🧪 Version $VERSION is now in staging. Test thoroughly before production!"
fi

echo ""
echo "Need help? Check:"
echo "- docs/SESSION_TRACKING_TEST_GUIDE.md"
echo "- docs/PRE_DEPLOYMENT_CHECKLIST_JUNE_2026.md"
echo "- DEPLOYMENT_SUMMARY_V2.1.0.md"
echo ""
