# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - heading "We use cookies" [level=3] [ref=e7]
      - paragraph [ref=e8]:
        - text: We use cookies to improve your experience and analyze platform usage. Essential cookies are required for the platform to function.
        - link "Learn more" [ref=e9] [cursor=pointer]:
          - /url: /legal/cookie-policy
    - generic [ref=e10]:
      - button "Accept All" [ref=e11] [cursor=pointer]
      - button "Reject Non-Essential" [ref=e12] [cursor=pointer]
      - button "Customize" [ref=e13] [cursor=pointer]
  - main [ref=e14]:
    - generic [ref=e16]:
      - heading "404" [level=1] [ref=e17]
      - heading "Page not found" [level=2] [ref=e18]
      - link "Go back home" [ref=e19] [cursor=pointer]:
        - /url: /
  - alert [ref=e20]
```