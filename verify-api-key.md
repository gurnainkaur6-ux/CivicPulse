# API Key Verification Checklist

## Current Situation
- ❌ All 5+ API keys fail with: `missing scopes (["collections.read"])`
- ✅ Project ID confirmed: `6ae1ea0c0017d3b0031b`
- ✅ Database ID confirmed: `6ae1ea52001320807f79`
- ✅ Database type: TablesDB (DocumentsDB)

## New Approach: Verify Key Creation Location

### Step 1: Navigate to API Keys Section
1. Go to: https://cloud.appwrite.io/console/project-6ae1ea0c0017d3b0031b/settings/keys
2. **CRITICAL:** Make sure the URL shows `/project-6ae1ea0c0017d3b0031b/`
3. You should see a page titled "API Keys" with a list of keys

### Step 2: Check Key Type
When you see your API keys listed, look at each one:
- Does it say "Server SDK" or something else?
- Is there a "Type" column?

### Step 3: Create NEW Key (Fresh Start)
1. Click "Create API Key" button
2. Give it name: `CivicPulse-Full-Access`
3. **EXPIRATION:** Set to "Never" or a far future date
4. **SCOPES SECTION:**
   - Look for a checkbox or button that says "Select all scopes" or "All scopes"
   - Click it
   - **VERIFY:** Scroll through the entire list and confirm you see these checked:
     - ✅ collections.read
     - ✅ collections.write
     - ✅ documents.read
     - ✅ documents.write
     - ✅ databases.read
     - ✅ attributes.read
     - ✅ attributes.write
5. Click "Create" (NOT "Update")
6. **COPY THE KEY IMMEDIATELY** - it only shows once

### Step 4: Alternative - Try Session Client Instead
If API keys keep failing, we can switch to a client-side approach using Appwrite's session-based auth instead of API keys.

## Questions for You:
1. When you create an API key, what does the page title say? Is it "API Keys" or something else?
2. Do you see a dropdown for "Type" when creating the key?
3. Can you take a screenshot of the "Create API Key" form BEFORE clicking create?

## If All Else Fails:
We can use Appwrite's client SDK with session authentication instead of server-side API keys. This is actually more secure for a hackathon demo.
