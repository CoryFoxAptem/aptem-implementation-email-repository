# Aptem Implementation Emails

A stripped-back, static version of the Aptem implementation training portal. It contains a suggested pre-session email and post-session email for each of the 32 implementation sessions — and nothing else.

## Use

Open `index.html` in a browser, or serve this folder locally:

```powershell
python -m http.server 5173
```

Then open `http://127.0.0.1:5173`.

Select a session, choose the pre-session or post-session tab, tailor the placeholders, and use the matching copy button to copy the plain-text version.

## Tailoring post-session emails with Four/Four

On the **Post-session email** tab, upload the `.eml` Four/Four summary email for that session. The portal validates that it is a Four/Four summary, extracts the customer name, action items, and a Four/Four conversation link when present. It merges customer and shared Four/Four actions into the standard customer-action section, keeps the template actions as a safety net, and adds a separate Aptem follow-up section where applicable. If no Four/Four actions are found, the standard post-session template remains in use.

The EML file is processed locally in the browser. It is not uploaded, saved, or sent anywhere; the tailored detail lasts only for the current browser session.
