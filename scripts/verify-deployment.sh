#!/bin/bash

# ============================================================================
# Deployment Verification Script - v2.1.0
# ============================================================================
# Description: Verify deployment is successful
# Usage: ./scripts/verify-deployment.sh [production_url]
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PRODUCTION_URL="${1:-http://localhost:3000}"
PASSED=0
FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Print banner
echo "============================================================================"
echo "  🔍 Deployment Verification - v2.1.0"
echo "  URL: $PRODUCTION_URL"
echo "  Date: $(date)"
echo "============================================================================"
echo ""

# Test 1: Health Check
log_info "Test 1: Checking if application is accessible..."
if curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" | grep -q "200\|301\|302"; then
    log_success "Application is accessible"
else
    log_error "Application is not accessible"
fi

# Test 2: API Health
log_info "Test 2: Checking API endpoints..."
if curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/health" | grep -q "200"; then
    log_success "API health endpoint responding"
else
    log_warning "API health endpoint not found (optional)"
fi

# Test 3: Static Assets
log_info "Test 3: Checking static assets..."
if curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/_next/static/" | grep -q "200\|301\|302"; then
    log_success "Static assets loading"
else
    log_error "Static assets not loading correctly"
fi

# Test 4: Session Tracking API
log_info "Test 4: Checking session tracking API..."
if curl -s "$PRODUCTION_URL/api/auth/validate-session" | grep -q "Missing credentials\|username"; then
    log_success "Session validation API responding"
else
    log_error "Session validation API not working"
fi

# Test 5: Build info
log_info "Test 5: Checking build version..."
if curl -s "$PRODUCTION_URL" | grep -q "v2.1"; then
    log_success "v2.1.0 detected in response"
else
    log_warning "Version detection inconclusive (not critical)"
fi

# Test 6: Database connection
log_info "Test 6: Testing database connectivity..."
log_info "Please manually verify database migration was applied:"
echo ""
echo "  Run this SQL query:"
echo "  SELECT column_name FROM information_schema.columns"
echo "  WHERE table_name = 'users'"
echo "  AND column_name LIKE '%session%';"
echo ""
echo "  Expected: 3 rows (active_session_id, session_created_at, last_activity)"
echo ""
read -p "Has the database migration been applied? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_success "Database migration confirmed"
else
    log_error "Database migration not confirmed"
fi

# Test 7: Login page
log_info "Test 7: Checking login page..."
if curl -s "$PRODUCTION_URL" | grep -q "login\|Login\|Sign in"; then
    log_success "Login page accessible"
else
    log_error "Login page not found"
fi

# Test 8: HTTPS (if applicable)
if [[ "$PRODUCTION_URL" =~ ^https:// ]]; then
    log_info "Test 8: Checking HTTPS/SSL..."
    if curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" | grep -q "200"; then
        log_success "HTTPS working correctly"
    else
        log_error "HTTPS not working"
    fi
else
    log_warning "Test 8: HTTPS not configured (using HTTP)"
fi

# Summary
echo ""
echo "============================================================================"
echo "  📊 Verification Summary"
echo "============================================================================"
echo ""
echo -e "${GREEN}Passed:${NC} $PASSED tests"
echo -e "${RED}Failed:${NC} $FAILED tests"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ DEPLOYMENT VERIFIED SUCCESSFULLY${NC}"
    echo ""
    echo "Next steps:"
    echo "1. ✅ Test login with all user roles"
    echo "2. ✅ Test multi-device session tracking"
    echo "3. ✅ Monitor logs for 1-2 hours"
    echo "4. ✅ Send team announcement"
    echo ""
    exit 0
else
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo ""
    echo "Please review the failed tests above."
    echo "Consider rolling back if critical issues found."
    echo ""
    exit 1
fi
