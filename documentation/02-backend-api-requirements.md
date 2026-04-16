# AIMarket Pro — Backend API Requirements

This document outlines the required backend API endpoints for every major interactive element (buttons, forms, toggles) present in the AIMarket Pro frontend, mapped page-by-page. Use this as a schema guide for implementation.

---

## 1. Dashboard (`Dashboard.jsx`)

### Campaign Optimization Toggle
*Changes how the AI engine treats the user's running ad campaigns.*
- **Action**: User switches between `auto` and `manual` optimization modes.
- **Backend Route**: `PUT /api/v1/user/preferences/optimization-mode`
- **Request Payload**:
  ```json
  { "mode": "auto" | "manual" }
  ```
- **Response**: `200 OK`

### Create New Ad
- **Action**: User clicks "Create New Ad".
- **Backend Route**: No direct API call required to *open* the page, however, backend should prepare to handle a new draft in the `CreateAd.jsx` flow.

---

## 2. Ad Creation Wizard (`CreateAd.jsx`)

### Step 1: Upload Assets / Submit Description
*User provides the base seed for the AI generation.*
- **Action**: User clicks "Analyze & Generate Ad" after providing image/video/text.
- **Backend Route**: `POST /api/v1/campaigns/draft/analyze`
- **Request Payload** (Multipart Form Data if media is included):
  ```json
  {
    "description": "Premium summer collection...",
    "mediaUrls": ["s3://bucket/image.jpg"],
    "campaignGoals": ["conversions"]
  }
  ```
- **Response**:
  ```json
  {
    "draftId": "dft_89234x",
    "suggestedTargeting": { "demographics": ["Women 25-34"] },
    "generatedCopy": {
      "outcomes": [
        { "headline": "Shop the Premium Collection", "body": "Light, breezy, bold." }
      ]
    }
  }
  ```

### Step 5: Ad Preview & Actions
*User interacts with the generated assets before launching.*
- **Action**: "Download Creative"
  - **Backend Route**: `GET /api/v1/campaigns/draft/:id/assets/download` (Returns a ZIP file of images/videos)
- **Action**: "Request Changes"
  - **Backend Route**: `POST /api/v1/campaigns/draft/:id/regenerate`
  - **Request Payload**: `{ "feedback": "Make it more energetic and targeted at teens." }`

### Launch Campaign
*Approving the ad and pushing it to Meta/Google.*
- **Action**: "Approve & Launch"
- **Backend Route**: `POST /api/v1/campaigns/draft/:id/launch`
- **Request Payload**:
  ```json
  {
    "platforms": ["facebook", "instagram"],
    "dailyBudget": 40,
    "locationTargeting": "worldwide" | "radius",
    "radiusOptions": { "lat": 40.71, "lng": -74.00, "distanceKm": 50 }
  }
  ```
- **Response**: `200 OK` (Indicates successfully queued for publishing to ad network APIs)

---

## 3. CRM & Lead Capture (`CRM.jsx` & `AdClick.jsx`)

### Process Captured Lead (Ad Landing Page)
*When an end-user clicks the simulated ad and fills out the form.*
- **Action**: "Claim My Offer" form submission.
- **Backend Route**: `POST /api/v1/leads/capture`
- **Request Payload**:
  ```json
  {
    "campaignId": "camp_123",
    "fullName": "Alex Thompson",
    "email": "alex.t@example.com",
    "productId": "summer-collection"
  }
  ```
- **Response**: `201 Created`

### Load CRM Table
*When the advertiser goes to Leads / CRM to view their data.*
- **Action**: Page load / Searching / Filtering.
- **Backend Route**: `GET /api/v1/leads`
- **Query Params**: `?search=&status=New&sortBy=date_desc`
- **Response**: List of Lead objects including properties for `name`, `email`, `source`, `value`, `date`, `status`, and `audience_tag`.

---

## 4. Settings & Configuration (`Settings.jsx`)

### Save API Keys
*User brings their own API keys for Groq/HuggingFace, or configures Instagram IDs.*
- **Action**: "Save Settings" button.
- **Backend Route**: `PUT /api/v1/user/credentials`
- **Request Payload**:
  ```json
  {
    "groq_key": "gsk_abc123...",
    "hf_key": "hf_xyz987...",
    "ig_token": "EAA...",
    "ig_user_id": "178414..."
  }
  ```
*(Note: Backend must encrypt these keys before storing them in the DB in accordance with BYOK security practices).*

### Save Notification Preferences
*User changes which system alerts they want to receive.*
- **Action**: Toggling checkboxes and saving.
- **Backend Route**: `PUT /api/v1/user/preferences/notifications`
- **Request Payload**:
  ```json
  {
    "alert_budget": true,
    "alert_performance": false,
    "alert_scale": true
  }
  ```

---

## 5. Billing & Integrations (`Billing.jsx`)

### Add Payment Method (Stripe/PayPal)
*User adds a card to pay the platform service fee.*
- **Action**: "Add Payment Method" or selecting Stripe/PayPal.
- **Backend Route**: `POST /api/v1/billing/setup-intent`
- **Response**: Returns a Stripe/PayPal setup intent token for the frontend to initialize checkout securely.

### Ad Account Connections (OAuth)
*User links their Facebook/Google accounts.*
- **Action**: "Connect Account" / "Manage Sync" buttons next to Meta/Google.
- **Backend Route**: `GET /api/v1/integrations/oauth/meta/authorize`
- **Response**: Returns the URL to redirect the user to for the standard OAuth flow. Upon callback, backend stores the refresh tokens.

---

## 6. AI Chatbot (`Chatbot.jsx`)
*The persistent AI assistant drawer.*
- **Action**: User types a message and hits send.
- **Backend Route**: `POST /api/v1/chat/completions` (Ideally via WebSockets or Server-Sent Events / SSE for streaming).
- **Request Payload**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "Help me write a hook for a fitness app." }
    ],
    "context": { "currentRoute": "/create-ad" }
  }
  ```
