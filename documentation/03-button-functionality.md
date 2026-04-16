# AIMarket Pro — UI Button Functionality Guide

This document catalogs every interactive button across the AIMarket Pro frontend application and defines its functional specifications. It serves as a guide for both frontend UI/UX logic and backend event triggers.

---

## 1. Global Layout & Components

### Sidebar (`Sidebar.jsx`)
- **Navigation Links (Dashboard, Create Ad, Analytics, CRM, Billing)**: Switches between the primary app views.
- **Settings (Gear Icon)**: Opens the overarching settings modal for API keys and preferences.

### Header (`Header.jsx`)
- **Notification Bell**: Toggles the drop-down panel showing recent system alerts (e.g., "Campaign optimization successful").
- **Mark all as read**: Dismisses unread notifications.
- **User Profile Dropdown**: Toggles the account context menu (billing, plan upgrade, sign out).

### Assistant Chatbot (`Chatbot.jsx`)
- **Floating Action Button (Bottom Right)**: Toggles the persistent AI assistant drawer.
- **Close 'X'**: Hides the drawer.
- **Send Message (Arrow Icon)**: Submits the user's prompt to the AI backend and locks the input field while awaiting the stream response.

### Settings Modal (`Settings.jsx`)
- **Save Settings**: Scrapes the input fields and checkboxes, validates them, and pushes updates to the backend (or `localStorage`) to update user config. Also triggers a success confirmation toast/message.
- **Close 'X'**: Dismisses the settings modal without saving any unsaved state.

---

## 2. Public Marketing (`Landing.jsx`)
- **"Start Creating", "Try AI Market Pro"**: Navigates the anonymous user to the core funnel (`/create-ad`). In a full production environment, this would likely redirect to `/signup` or an Auth0 login gate first.

---

## 3. App Dashboard (`Dashboard.jsx`)
- **Create New Ad (Primary)**: Initiates the ad campaign wizard by navigating to `/create-ad`.
- **Auto-Optimization Mode Select**: Toggles the backend campaign engine to autonomously shift budgets without user approval.
- **Manual Approval Mode Select**: Toggles the backend to only suggest scaled budgets, requiring explicit user approval before network changes are applied.

---

## 4. Ad Creation Wizard (`CreateAd.jsx`)
- **"Analyze & Generate Ad"**: 
  - Validates that text or media has been provided.
  - Sends payload to backend AI engine.
  - Transitions to loading state, then reveals generated variations.
- **Targeting / Budget Navigation ("Next", "Back")**: Advances or reverses the linear state machine of the wizard. Validates current step's inputs (e.g., minimum budget values) before proceeding.
- **"Daily Spend" / "Lifetime Cap" Toggles**: Switches the behavior of the active budget calculation. 
- **"Shop Now" (Ad Preview card)**: Simulates the end-user experience by opening the generated ad landing page (`/ad`) in a new browser tab.
- **"Download Creative"**: Triggers a browser download of the AI-generated high-res image/video.
- **"Copy Ad Copy"**: Extracts the current variation's text payload and writes it to the user's system clipboard (`navigator.clipboard`).
- **"Request Changes"**: Reverts the user back to the generation/parameter step to adjust the prompts.
- **"Approve & Launch"**: Commits the entire campaign config (assets, targeting, budget) to the backend publishing worker and shows the success screen.

---

## 5. CRM & Lead Tracking (`CRM.jsx` & `AdClick.jsx`)
- **"Filter" (CRM)**: Opens a dropdown to filter the table by status (e.g., Only "Converted"), date range, or audience type.
- **"Simulate Ad Click"**: Opens the generated public landing page for testing.
- **View Details (External Link Icon on Table Row)**: Opens a modal with extended CRM data about the lead.
- **"Claim My Offer" (AdClick)**: Validates email/name format, captures the lead, triggers backend webhook, and transitions form to success state.
- **"Capture Another" (AdClick)**: Resets the form state for rapid testing.

---

## 6. Billing & Integrations (`Billing.jsx`)
- **"Manage Sync" (Connected Ad Accounts)**: Opens a modal showing the active sync status of Meta/Google/TikTok and provides options to force-refresh tokens or disconnect the account.
- **"Connect Account"**: Redirects the user to the respective network's OAuth flow to grant advertising permissions to the platform.
- **"Change Plan"**: Brings up a pricing tier modal to upgrade from "Pro" to "Enterprise" (or vice versa).
- **"Stripe" / "PayPal" payment toggles**: Switches the active payment bridge UI.
- **"Add Payment Method"**: Invokes the Stripe Elements or PayPal secure popup to collect card details.
- **Download PDF (Invoice History)**: Requests a generated PDF artifact for the selected invoice ID from the backend.
