# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2]:
    - /url: "#main-content"
  - generic [ref=e5]:
    - paragraph [ref=e7]:
      - text: We use cookies to improve your experience and analyze platform usage. Essential cookies are required for the platform to function.
      - link "Learn more" [ref=e8]:
        - /url: /legal/cookie-policy
    - generic [ref=e9]:
      - button "Accept All" [ref=e10] [cursor=pointer]
      - button "Reject Non-Essential" [ref=e11] [cursor=pointer]
      - button "Customize" [ref=e12] [cursor=pointer]
  - main [ref=e13]:
    - generic [ref=e15]:
      - heading "404" [level=1] [ref=e16]
      - heading "Page not found" [level=2] [ref=e17]
      - link "Go back home" [ref=e18]:
        - /url: /
```