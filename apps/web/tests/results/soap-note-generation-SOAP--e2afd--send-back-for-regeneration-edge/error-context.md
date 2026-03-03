# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic [ref=e5]:
      - heading "404" [level=1] [ref=e6]
      - heading "Page not found" [level=2] [ref=e7]
      - link "Go back home" [ref=e8] [cursor=pointer]:
        - /url: /
  - alert [ref=e9]
```