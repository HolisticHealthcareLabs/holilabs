# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e5]:
    - paragraph [ref=e7]:
      - text: We use cookies to improve your experience and analyze platform usage. Essential cookies are required for the platform to function.
      - link "Learn more" [ref=e8] [cursor=pointer]:
        - /url: /legal/cookie-policy
    - generic [ref=e9]:
      - button "Accept All" [ref=e10] [cursor=pointer]
      - button "Reject Non-Essential" [ref=e11] [cursor=pointer]
      - button "Customize" [ref=e12] [cursor=pointer]
  - main [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e16]:
        - link "Holi Labs Holi Labs" [ref=e17] [cursor=pointer]:
          - /url: /portal/dashboard
          - img "Holi Labs" [ref=e18]
          - generic [ref=e19]: Holi Labs
        - generic [ref=e20]:
          - button [ref=e21] [cursor=pointer]:
            - img [ref=e22]
          - button [ref=e25] [cursor=pointer]:
            - img [ref=e26]
          - button "Switch to dark mode" [ref=e28] [cursor=pointer]:
            - img [ref=e29]
          - button [ref=e31] [cursor=pointer]:
            - img [ref=e32]
      - main [ref=e35]
  - alert [ref=e36]
```