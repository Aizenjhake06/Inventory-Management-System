# Session Tracking Testing Guide

**Feature:** Single-Device Login Security  
**Date:** June 21, 2026  
**Status:** Ready for Testing

---

## 🎯 Test Objectives

Verify that the session tracking system works correctly and users can only be logged in on one device at a time.

---

## 🧪 Test Scenarios

### **Test 1: Single Login** ✅

**Objective:** Verify normal login works and session is created

**Steps:**
1. Open browser (Chrome)
2. Navigate to login page
3. Login with valid credentials
4. Verify redirect to dashboard

**Expected Results:**
- ✅ Login successful
- ✅ sessionId stored in localStorage
- ✅ Dashboard loads correctly
- ✅ No errors in console

**How to Verify:**
```javascript
// Open browser console (F12)
localStorage.getItem('sessionId')
// Should return a 64-character hex string
```

---

### **Test 2: Multi-Device Login (Critical!)** 🔥

**Objective:** Verify that logging in from Device 2 invalidates Device 1's session

**Steps:**
1. **Device 1 (Chrome):**
   - Login with username: `test-user`
   - Note the sessionId in console
   - Stay on dashboard

2. **Device 2 (Firefox/Edge/Incognito):**
   - Login with same username: `test-user`
   - Verify login successful

3. **Back to Device 1:**
   - Wait 30 seconds (for session validation check)
   - Observe behavior

**Expected Results:**
- ✅ Device 2 login successful
- ✅ Device 1 shows toast notification: "Your account has been logged in on another device"
- ✅ Device 1 automatically redirects to login page
- ✅ Device 1 localStorage is cleared
- ✅ URL shows `?logout=session_invalid`

**Console Logs to Watch:**
```
[Session Guard] Session invalid, logging out...
[Session Guard] Your account has been logged in on another device
```

---

### **Test 3: Session Validation Interval** ⏱️

**Objective:** Verify session validation runs every 30 seconds

**Steps:**
1. Login to dashboard
2. Open browser console
3. Watch for validation logs
4. Keep browser open for 2 minutes

**Expected Results:**
- ✅ Validation check runs every 30 seconds
- ✅ Console shows: `[Session Guard] Starting session monitoring`
- ✅ No errors or failed validations
- ✅ Dashboard remains functional

**Console Pattern:**
```
[Session Guard] Starting session monitoring for: username
[Validate Session] POST /api/auth/validate-session
{ valid: true, message: "Session is valid" }
```

---

### **Test 4: Manual Logout** 🚪

**Objective:** Verify logout properly destroys session

**Steps:**
1. Login to dashboard
2. Note sessionId from localStorage
3. Click logout button
4. Confirm logout in dialog
5. Check database for session

**Expected Results:**
- ✅ Logout confirmation dialog appears
- ✅ API call to `/api/auth/logout` with username
- ✅ Redirect to login page
- ✅ All localStorage cleared
- ✅ Database shows `active_session_id = null`

**Verification SQL:**
```sql
SELECT username, active_session_id, session_created_at 
FROM users 
WHERE username = 'test-user';
```

---

### **Test 5: Login After Logout** 🔄

**Objective:** Verify user can login again after logout

**Steps:**
1. Complete Test 4 (logout)
2. Login again with same credentials
3. Verify new session is created

**Expected Results:**
- ✅ Login successful
- ✅ New sessionId generated (different from previous)
- ✅ Dashboard loads correctly
- ✅ Session validation works

---

### **Test 6: Invalid Session Detection** 🚫

**Objective:** Verify system detects invalid/expired sessions

**Steps:**
1. Login to dashboard
2. Open browser console
3. Manually change sessionId in localStorage:
   ```javascript
   localStorage.setItem('sessionId', 'invalid-session-id-12345')
   ```
4. Wait 30 seconds for validation check

**Expected Results:**
- ✅ Session validation fails
- ✅ Toast notification appears
- ✅ Auto-logout to login page
- ✅ localStorage cleared

---

### **Test 7: Network Error Handling** 🌐

**Objective:** Verify graceful handling of network errors

**Steps:**
1. Login to dashboard
2. Open DevTools > Network tab
3. Set throttling to "Offline"
4. Wait for next validation check (30s)

**Expected Results:**
- ✅ Network request fails
- ✅ Error logged to console
- ✅ User NOT logged out (stays on dashboard)
- ✅ When network restored, validation resumes

**Why:** We don't logout users on network errors, only on invalid sessions

---

### **Test 8: Multiple Roles** 👥

**Objective:** Verify session tracking works for all user roles

**Test for each role:**
- Admin
- Operations
- Packer
- Tracker
- Logistics Admin
- Dept Manager

**Steps:**
1. Login as each role
2. Verify session created
3. Test multi-device scenario
4. Test logout

**Expected Results:**
- ✅ All roles work the same
- ✅ Session tracking consistent across roles

---

### **Test 9: Browser Tab Sync** 🗂️

**Objective:** Verify multiple tabs in same browser share session

**Steps:**
1. Login in Tab 1
2. Open Tab 2 (same browser)
3. Navigate to dashboard in Tab 2
4. Logout from Tab 1
5. Check Tab 2 behavior

**Expected Results:**
- ✅ Both tabs use same sessionId
- ✅ Logout from Tab 1 clears localStorage
- ✅ Tab 2 detects invalid session on next check
- ✅ Tab 2 auto-redirects to login

---

### **Test 10: Session Persistence** 💾

**Objective:** Verify session survives page refresh

**Steps:**
1. Login to dashboard
2. Note sessionId from localStorage
3. Refresh page (F5)
4. Check if still logged in

**Expected Results:**
- ✅ User remains logged in after refresh
- ✅ Same sessionId in localStorage
- ✅ Dashboard loads without re-login
- ✅ Session guard continues to run

---

## 🐛 Common Issues & Fixes

### Issue 1: Session validation not running
**Symptoms:** No console logs after 30 seconds  
**Fix:** Check if `useSessionGuard()` is imported in layout  
**Verify:**
```typescript
import { useSessionGuard } from '@/lib/use-session-guard'

// In component
useSessionGuard()
```

### Issue 2: User not auto-logged out
**Symptoms:** Device 1 stays logged in after Device 2 login  
**Fix:** 
1. Check API endpoint exists: `/api/auth/validate-session`
2. Verify sessionId is being sent in request
3. Check server response

### Issue 3: Logout doesn't clear session
**Symptoms:** Can re-use old sessionId  
**Fix:** Verify logout API calls `destroySession()`
```typescript
await destroySession(username)
```

### Issue 4: SessionId not in localStorage
**Symptoms:** Login works but no sessionId stored  
**Fix:** Check login API response includes sessionId
```typescript
localStorage.setItem("sessionId", sessionId)
```

---

## 📊 Test Results Template

Use this template to document test results:

```markdown
## Test Results - [Date]

### Environment
- Browser: Chrome 120
- OS: Windows 11
- Database: Production/Staging

### Test 1: Single Login
- Status: ✅ PASS / ❌ FAIL
- Notes: 

### Test 2: Multi-Device Login
- Status: ✅ PASS / ❌ FAIL
- Device 1: 
- Device 2: 
- Auto-logout time: 
- Notes: 

### Test 3: Session Validation Interval
- Status: ✅ PASS / ❌ FAIL
- Validation frequency: 
- Notes: 

[Continue for all tests...]

### Overall Result
- Total Tests: 10
- Passed: 
- Failed: 
- Production Ready: YES / NO
```

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] All 10 tests pass
- [ ] No console errors
- [ ] Database migration applied (051_add_session_tracking.sql)
- [ ] Environment variables set
- [ ] Backup plan ready
- [ ] Monitoring enabled

---

## 📞 Support

If tests fail, check:
1. Browser console for errors
2. Network tab for API failures
3. Database for session data
4. Server logs for backend issues

**Need Help?** Open an issue with:
- Test scenario that failed
- Console logs
- Network requests
- Expected vs actual behavior

---

**Happy Testing! 🧪**
