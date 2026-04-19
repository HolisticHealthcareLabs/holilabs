import { sanitizeAIOutput } from '../sanitize-ai-output';

describe('sanitizeAIOutput', () => {
  it('strips HTML tags', () => {
    const input = "Patient has <script>alert('xss')</script>a fever of 101F. <div>Needs rest</div>";
    const expected = "Patient has alert('xss')a fever of 101F. Needs rest";
    expect(sanitizeAIOutput(input)).toBe(expected);
  });

  it('preserves markdown structure', () => {
    const input = "## Assessment\n- Finding 1\n- Finding 2";
    expect(sanitizeAIOutput(input)).toBe(input);
  });

  it('removes javascript: protocol URIs', () => {
    const input = "[Click here](javascript:alert('xss')) or [Here](JAVAScript:alert(1))";
    // It strips 'javascript:'
    expect(sanitizeAIOutput(input)).toBe("[Click here](alert('xss')) or [Here](alert(1))");
  });

  it('removes data: protocol URIs', () => {
    const input = "![Image](data:image/png;base64,iVBORw0KGgo...)";
    expect(sanitizeAIOutput(input)).toBe("![Image](image/png;base64,iVBORw0KGgo...)");
  });

  it('removes event handler attributes', () => {
    // If somehow markdown parser didn't catch it and it's plaintext
    const input = "This is a test ONERROR=alert(1) and onload = function() {}";
    expect(sanitizeAIOutput(input)).toBe("This is a test alert(1) and  function() {}");
  });

  it('preserves clinical abbreviations and special characters', () => {
    const input = "BP: 120/80 mmHg, SpO₂: 98%, HbA1c < 7%";
    expect(sanitizeAIOutput(input)).toBe(input);
  });

  it('handles empty string and null safety', () => {
    expect(sanitizeAIOutput('')).toBe('');
    expect(sanitizeAIOutput(null as any)).toBe(null);
    expect(sanitizeAIOutput(undefined as any)).toBe(undefined);
  });
});
