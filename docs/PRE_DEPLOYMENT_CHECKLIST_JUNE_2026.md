# Pre-Deployment Checklist - June 2026

**Deployment Date:** June 21, 2026  
**Version:** v2.1.0  
**Major Feature:** Session Tracking (Single-Device Login)

---

## 🎯 Deployment Summary

### New Features
- ✅ Session tracking with single-device login enforcement
- ✅ Auto-logout when logging in from another device  
- ✅ 30-second session validation interval
- ✅ Error boundaries for chart components

### Changes
- Database migration: `051_add_session_tracking.sql`
- New API endpoint: `/api/auth/validate-session`
- Updated logout handlers across all layouts
- Added `useSessionGuard()` hook to all protected pages

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 🔐 Security & Authentication

- [ ] **Session Tracking Migration Applied**
  ```sql
  -- Run this in production database:
  \i supabase/migrations/051_add_session_tracking.sql
  ```
  - Adds: `active_session_id`, `session_created_at`, `last_activity`

- [ ] **API Endpoints Verified**
  - [ ] `/api/auth/validate-session` - Returns 200 OK
  - [ ] `/api/auth/unified-login` - Creates session
  - [ ] `/api/auth/logout` - Destroys session

- [ ] **Environment Variables Set**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```

### 💾 Database

- [ ] **Backup Created**
  - [ ] Full database backup completed
  - [ ] Backup tested and verified
  - [ ] Rollback plan documented

- [ ] **Migration Verified**
  - [ ] Migration runs without errors
  - [ ] No data loss
  - [ ] All existing sessions still valid
  - [ ] Indexes created (if any)

- [ ] **Data Integrity**
  ```sql
  -- Verify users table structure
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name IN ('active_session_id', 'session_created_at', 'last_activity');
  ```

### 🧪 Testing

- [ ] **Session Tracking Tests**
  - [ ] Single login works
  - [ ] Multi-device login forces logout
  - [ ] Session validation runs every 30s
  - [ ] Manual logout destroys session
  - [ ] Invalid session detection works
  - [ ] All user roles tested

- [ ] **Regression Testing**
  - [ ] Existing login flow still works
  - [ ] Dashboard loads correctly
  - [ ] Charts display data
  - [ ] No console errors
  - [ ] Mobile responsive

- [ ] **Browser Compatibility**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)
  - [ ] Safari (latest)
  - [ ] Mobile browsers

### 🚀 Build & Deploy

- [ ] **Build Verification**
  ```bash
  npm run build
  # Should complete without errors
  ```

- [ ] **Type Check**
  ```bash
  npm run type-check
  # Should pass with 0 errors
  ```

- [ ] **Lint Check**
  ```bash
  npm run lint
  # Should pass or show only warnings
  ```

- [ ] **Bundle Size Check**
  - [ ] Check build output size
  - [ ] Ensure no massive size increase
  - [ ] Verify code splitting working

### 📱 Frontend

- [ ] **Session Guard Integration**
  - [ ] Packer layout has `useSessionGuard()`
  - [ ] Tracker layout has `useSessionGuard()`
  - [ ] Dept Manager layout has `useSessionGuard()`
  - [ ] Logistics layout has `useSessionGuard()`
  - [ ] Admin layout has session guard

- [ ] **Logout Handlers Updated**
  - [ ] All logout buttons call API
  - [ ] Username sent to destroy session
  - [ ] sessionId cleared from localStorage
  - [ ] Proper error handling

- [ ] **Error Boundaries**
  - [ ] Top Products Chart has try-catch
  - [ ] Top Stores Chart has try-catch
  - [ ] Empty states render correctly

### 🔍 Code Quality

- [ ] **No Debug Code**
  - [ ] No `console.log` in production code
  - [ ] No `debugger` statements
  - [ ] No test/mock data hardcoded
  - [ ] No commented-out code blocks

- [ ] **Documentation Updated**
  - [ ] README.md updated
  - [ ] SESSION_TRACKING_COMPLETE.md exists
  - [ ] API documentation current
  - [ ] Deployment guide updated

- [ ] **Git Status**
  - [ ] All changes committed
  - [ ] Meaningful commit messages
  - [ ] Feature branch merged to main
  - [ ] Tagged with version number
    ```bash
    git tag -a v2.1.0 -m "Session tracking release"
    git push origin v2.1.0
    ```

### 📊 Monitoring & Logging

- [ ] **Error Tracking Ready**
  - [ ] Sentry configured (if using)
  - [ ] Error boundaries in place
  - [ ] API error logging enabled
  - [ ] Frontend error logging setup

- [ ] **Analytics Ready**
  - [ ] Login events tracked
  - [ ] Logout events tracked
  - [ ] Session validation tracked
  - [ ] Dashboard access tracked

- [ ] **Performance Monitoring**
  - [ ] API response time < 200ms
  - [ ] Page load time < 2s
  - [ ] Session validation time < 100ms

### 🔄 Rollback Plan

- [ ] **Rollback Prepared**
  - [ ] Previous version documented
  - [ ] Rollback SQL script ready:
    ```sql
    -- Rollback if needed
    ALTER TABLE users DROP COLUMN IF EXISTS active_session_id;
    ALTER TABLE users DROP COLUMN IF EXISTS session_created_at;
    ALTER TABLE users DROP COLUMN IF EXISTS last_activity;
    ```
  - [ ] Previous deployment accessible
  - [ ] Team knows rollback procedure

- [ ] **Monitoring Thresholds Set**
  - Error rate > 5% → Investigate
  - Error rate > 10% → Consider rollback
  - Response time > 1s → Investigate

### 👥 Team Communication

- [ ] **Stakeholders Notified**
  - [ ] Deployment time communicated
  - [ ] Expected downtime (if any)
  - [ ] New feature explained
  - [ ] Support team briefed

- [ ] **User Communication**
  - [ ] Release notes prepared
  - [ ] Known limitations documented
  - [ ] FAQ updated
  - [ ] Support channels ready

### 🌐 Environment-Specific

#### Staging
- [ ] Migration applied to staging DB
- [ ] Staging deployment successful
- [ ] All tests pass on staging
- [ ] Performance acceptable
- [ ] No errors in logs

#### Production
- [ ] Maintenance window scheduled (if needed)
- [ ] Backup completed
- [ ] Migration script ready
- [ ] Deployment command prepared
- [ ] Monitoring active

---

## 🚀 Deployment Steps

### 1. Pre-Deployment (15 mins before)
```bash
# 1. Create database backup
pg_dump -h [host] -U [user] -d [db] > backup_pre_session_tracking.sql

# 2. Verify build
npm run build

# 3. Final git check
git status
git log --oneline -5
```

### 2. Database Migration (5 mins)
```sql
-- Connect to production database
psql -h [host] -U [user] -d [db]

-- Run migration
\i supabase/migrations/051_add_session_tracking.sql

-- Verify
SELECT * FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('active_session_id', 'session_created_at', 'last_activity');
```

### 3. Deploy Application (10 mins)
```bash
# If using Vercel
git push origin main
# Vercel auto-deploys

# If using custom hosting
npm run build
npm run start
```

### 4. Post-Deployment Verification (15 mins)
```bash
# 1. Health check
curl https://your-domain.com/api/health

# 2. Test login
# 3. Test multi-device scenario
# 4. Check error logs
# 5. Monitor performance
```

---

## 📈 Success Criteria

Deployment is successful if:
- ✅ All tests pass
- ✅ No critical errors in logs
- ✅ Login/logout working
- ✅ Session tracking functional
- ✅ No user complaints in first hour
- ✅ Performance within acceptable range

---

## 🆘 Emergency Contacts

**On-Call Engineer:** [Your Name]  
**Database Admin:** [DBA Name]  
**DevOps Team:** [Team Contact]  
**Project Manager:** [PM Name]

---

## 📝 Sign-Off

Before deployment, sign off on each section:

- [ ] **Technical Lead:** ___________________ Date: _______
- [ ] **QA Lead:** _________________________ Date: _______
- [ ] **DevOps Lead:** _____________________ Date: _______
- [ ] **Product Owner:** ___________________ Date: _______

---

## 🎉 Post-Deployment Tasks

After successful deployment:

- [ ] Update internal wiki
- [ ] Send success email to stakeholders
- [ ] Close related Jira tickets
- [ ] Schedule post-mortem meeting
- [ ] Document lessons learned
- [ ] Update changelog
- [ ] Celebrate! 🎊

---

**Deployment Command:**
```bash
# Final deployment command
git push origin main && \
echo "✅ Deployment initiated!" && \
echo "🔍 Monitor at: https://your-domain.com" && \
echo "📊 Logs at: [Your logging dashboard]"
```

---

**Good luck with the deployment! 🚀**
