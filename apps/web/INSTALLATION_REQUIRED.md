# Installation Required for Legal Documents

## Required NPM Packages

The following package needs to be installed for the legal document viewer to work:

```bash
npm install react-markdown
```

## Installation Instructions

Run the following command from the `/apps/web` directory:

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web
npm install react-markdown
```

## What This Package Does

`react-markdown` is used in the `LegalDocumentViewer` component to render the markdown legal documents in the browser with proper styling.

## After Installation

Once installed, the legal document pages will be fully functional:
- `/legal/terms-of-service`
- `/legal/privacy-policy`
- `/legal/baa`
- `/legal/hipaa-notice`
- `/legal/consent`

## Alternative (If Installation Fails)

If you cannot install `react-markdown`, you can modify the `LegalDocumentViewer` component to display documents without markdown rendering by simply showing the raw markdown text or embedding the documents as iframes.
