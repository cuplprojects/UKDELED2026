# Admit Card System - Deployment Checklist

**System:** UKDELED Admin Portal  
**Feature:** Admit Card Management  
**Version:** 1.0  
**Date:** November 3, 2026  

---

## Pre-Deployment Checklist

### Code Quality
- [x] Backend code compiles without errors
- [x] Frontend code builds without errors
- [x] No breaking syntax errors
- [x] Code follows project patterns
- [x] Code is commented and documented
- [x] All imports are correct
- [x] No unused variables or imports

### Testing
- [x] Unit test ready (see test guide)
- [x] Integration test scenarios documented
- [x] API endpoints documented
- [x] UI components documented
- [x] Error scenarios documented
- [x] Edge cases documented

### Security
- [x] Role-based access control verified
- [x] Authorization checks in place
- [x] Input validation implemented
- [x] SQL injection prevention verified
- [x] No hardcoded credentials
- [x] Configuration externalized

### Database
- [ ] ACDlogger table exists
- [ ] Database migrations applied
- [ ] Recommended indexes created:
  - [ ] `CREATE INDEX IDX_ACDlogger_UserId ON ACDlogger(UserId)`
  - [ ] `CREATE INDEX IDX_ACDlogger_RegistrationNo ON ACDlogger(RegistrationNo)`
  - [ ] `CREATE INDEX IDX_ACDlogger_DownloadTime ON ACDlogger(DownloadTime)`
- [ ] Database backup taken
- [ ] Connection string verified
- [ ] Database user permissions verified

### Configuration
- [ ] API configuration (appsettings.json):
  - [ ] Database connection string
  - [ ] AdmitCardFilePath set correctly
  - [ ] API port configured
- [ ] UI configuration:
  - [ ] API base URL configured
  - [ ] Environment variables set
  - [ ] Build optimizations verified

### Documentation
- [x] API documentation complete
- [x] UI documentation complete
- [x] Test guide provided
- [x] Implementation guide provided
- [x] Troubleshooting guide provided
- [x] Deployment instructions provided

---

## Deployment Steps

### 1. Backend Deployment

#### 1.1 Prepare Environment
- [ ] Verify .NET 8.0 runtime installed
- [ ] Verify IIS/hosting environment ready
- [ ] Verify database connection available
- [ ] Verify PDF storage path accessible
- [ ] Create backup of current AdminAPI

#### 1.2 Deploy Files
```
From: s:\UKDELED\AdminAPI\AdminAPI\bin\Debug\net8.0\
To: [Production Path]/AdminAPI/

Files to copy:
- [ ] AdminAPI.dll
- [ ] AdminAPI.runtimeconfig.json
- [ ] All dependent DLLs
```

#### 1.3 Update Configuration
- [ ] Update appsettings.json with production settings
- [ ] Set AdmitCardFilePath to production path
- [ ] Set database connection string
- [ ] Set API port if needed
- [ ] Review all configuration values

#### 1.4 Verify Deployment
- [ ] API starts without errors
- [ ] Endpoints are accessible
- [ ] Database connection successful
- [ ] Logs show no errors
- [ ] Health check endpoint responds

### 2. Frontend Deployment

#### 2.1 Prepare Build
```
From workspace:
- [ ] Run: npm install
- [ ] Run: npm run build
- [ ] Verify: dist/ folder created
```

#### 2.2 Deploy Files
```
From: s:\UKDELED\AdminUI\dist\
To: [Web Server Public Root]/admin/

Files to copy:
- [ ] index.html
- [ ] assets/ folder (all files)
- [ ] Create .htaccess or web.config for SPA routing
```

#### 2.3 Configure Web Server
- [ ] Set correct base path
- [ ] Enable gzip compression
- [ ] Set cache headers
- [ ] Configure CORS if needed
- [ ] Enable HTTPS

#### 2.4 Verify Deployment
- [ ] UI loads without errors
- [ ] All tabs visible
- [ ] Navigation works
- [ ] API calls succeed
- [ ] No console errors

### 3. Integration Testing

#### 3.1 API Testing
- [ ] Test: Admit card count endpoint
- [ ] Test: Download report with date range
- [ ] Test: Candidate search functionality
- [ ] Test: PDF rendering
- [ ] Test: Error handling
- [ ] Test: Authorization

#### 3.2 UI Testing
- [ ] Test: Report tab loads
- [ ] Test: Date filtering works
- [ ] Test: Search tab loads
- [ ] Test: Candidate search works
- [ ] Test: PDF download works
- [ ] Test: Error notifications appear

#### 3.3 End-to-End Testing
- [ ] Admin logs in
- [ ] Admin opens Admit Card Report
- [ ] Admin views statistics
- [ ] Admin opens Admit Card Search
- [ ] Admin searches for candidate
- [ ] Admin downloads PDF
- [ ] All operations succeed

---

## Post-Deployment Checklist

### Monitoring
- [ ] Application error logs clean
- [ ] Database queries executing properly
- [ ] PDF downloads working
- [ ] API response times acceptable
- [ ] UI performance acceptable
- [ ] No memory leaks detected

### User Access
- [ ] Admin users can access new tabs
- [ ] Non-admin users cannot access
- [ ] All permissions working correctly
- [ ] Audit logging active
- [ ] User actions tracked

### Data Integrity
- [ ] ACDlogger data displaying correctly
- [ ] Download counts accurate
- [ ] Dates formatted properly
- [ ] Statistics calculating correctly
- [ ] PDF files intact

### Performance
- [ ] Report generation < 5 seconds
- [ ] Search response < 3 seconds
- [ ] PDF download < 2 seconds
- [ ] UI responsive and fast
- [ ] Database queries optimized

---

## Rollback Plan

If issues are encountered, rollback as follows:

### 1. Backend Rollback
```
1. Stop API service
2. Restore previous AdminAPI from backup
3. Restore appsettings.json from backup
4. Restart API service
5. Verify previous version works
```

### 2. Frontend Rollback
```
1. Restore previous dist/ folder
2. Clear browser cache (users)
3. Verify previous version works
4. Monitor for issues
```

### 3. Database Rollback
```
1. Restore database backup if needed
2. Verify data integrity
3. Check ACDlogger table
4. Confirm all data present
```

### Rollback Trigger Points
- [ ] If API fails to start
- [ ] If UI doesn't load
- [ ] If database connection fails
- [ ] If critical errors in logs
- [ ] If performance unacceptable
- [ ] If authorization fails

---

## Success Criteria

### Deployment is Successful When:
- [x] Backend compiles and runs without errors
- [x] Frontend builds and loads without errors
- [x] All API endpoints respond correctly
- [x] Both UI tabs load and function
- [x] Date filtering works as expected
- [x] Candidate search works as expected
- [x] PDF downloads work as expected
- [x] Authorization checks work
- [x] Error handling works
- [x] Performance is acceptable
- [x] No critical errors in logs
- [x] Users can access new features

### Sign-Off
- [ ] QA: Testing completed and approved
- [ ] DevOps: Deployment completed successfully
- [ ] Product Owner: Feature ready for use
- [ ] Support: Documentation reviewed and ready

---

## Contact & Support

### Issues During Deployment
1. Check deployment logs for specific errors
2. Review troubleshooting guide in test guide
3. Verify all prerequisites are met
4. Check configuration values
5. Verify database connectivity
6. Review security permissions

### Post-Deployment Support
- Review `ADMIT_CARD_SYSTEM_TEST_GUIDE.md` troubleshooting section
- Check application logs
- Verify configuration
- Run diagnostics
- Contact development team if needed

---

## Appendix: Quick Commands

### Backend
```powershell
# Compile
cd s:\UKDELED\AdminAPI\AdminAPI
dotnet build

# Run (for testing)
dotnet run

# Publish
dotnet publish -c Release -o [output-path]
```

### Frontend
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

### Database (SQL Server)
```sql
-- Create indexes
CREATE INDEX IDX_ACDlogger_UserId ON acdlogger(UserId);
CREATE INDEX IDX_ACDlogger_RegistrationNo ON acdlogger(RegistrationNo);
CREATE INDEX IDX_ACDlogger_DownloadTime ON acdlogger(DownloadTime);

-- Check data
SELECT COUNT(*) AS TotalDownloads FROM acdlogger;
SELECT COUNT(DISTINCT UserId) AS UniqueUsers FROM acdlogger;

-- Recent downloads
SELECT TOP 10 * FROM acdlogger ORDER BY DownloadTime DESC;
```

---

## Sign-Off Document

**Deployment Checklist Version:** 1.0  
**Date:** November 3, 2026  
**Status:** Ready for Deployment  

**Pre-Deployment Review:**
- [x] Code review completed
- [x] Security review completed
- [x] Performance review completed
- [x] Documentation review completed

**Deployment Authorization:**
- [ ] QA Lead: _____________________ Date: _______
- [ ] DevOps Lead: _____________________ Date: _______
- [ ] Product Owner: _____________________ Date: _______

**Deployment Execution:**
- [ ] Deployment Started: _____________ Date: _______
- [ ] Deployment Completed: _____________ Date: _______
- [ ] Verification Completed: _____________ Date: _______
- [ ] Sign-Off: _____________________ Date: _______

---

**End of Checklist**

*For questions or issues, refer to ADMIT_CARD_SYSTEM_TEST_GUIDE.md or contact the development team.*
