/**
 * @vitest-environment jsdom
 */

/**
 * MessageMarkdown Component Tests
 *
 * This test suite demonstrates that the MessageMarkdown component:
 *  Renders markdown safely and correctly
 *  Prevents XSS attacks through proper sanitization
 *  Auto-links URLs with security attributes
 *  Adds word breaks for better typography
 *  Supports custom components
 *  Handles edge cases gracefully
 */

import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import MessageMarkdown from "@/components/messageMarkdown";

describe("MessageMarkdown", () => {
  describe("✅ Core Markdown Rendering", () => {
    it("renders all standard markdown elements correctly", () => {
      const markdown = `# Heading 1
## Heading 2
**Bold text** and *italic text*

- List item 1
- List item 2

\`inline code\`

> Blockquote text`;

      const { container } = render(<MessageMarkdown>{markdown}</MessageMarkdown>);

      expect(container.querySelector("h1")).toBeTruthy();
      expect(container.querySelector("h2")).toBeTruthy();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("em")).toBeTruthy();
      expect(container.querySelector("ul")).toBeTruthy();
      expect(container.querySelectorAll("li")).toHaveLength(2);
      expect(container.querySelector("code")).toBeTruthy();
      expect(container.querySelector("blockquote")).toBeTruthy();
    });

    it("handles empty and null content gracefully", () => {
      const { container: emptyContainer } = render(<MessageMarkdown>{""}</MessageMarkdown>);
      const { container: nullContainer } = render(<MessageMarkdown>{null}</MessageMarkdown>);

      expect(emptyContainer.textContent).toBe("");
      expect(nullContainer.textContent).toBe("");
    });

    it("applies custom className properly", () => {
      const { container } = render(<MessageMarkdown className="custom-class">Test</MessageMarkdown>);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("🔒 Security - XSS Prevention", () => {
    it("prevents script execution by treating HTML as text when allowHtml is false", () => {
      const maliciousInput = `<script>alert('XSS Attack!');</script>
<img src="x" onerror="alert('XSS')">
Safe text content`;

      const { container } = render(<MessageMarkdown allowHtml={false}>{maliciousInput}</MessageMarkdown>);

      // No actual script elements should be created
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")).toBeNull();

      // Content should be treated as plain text
      expect(container.textContent).toContain("Safe text content");
      // HTML should be escaped/rendered as text
      expect(container.textContent).toContain("<script>");
    });

    it("sanitizes dangerous HTML when allowHtml is true", () => {
      const maliciousInput = `<p>Safe paragraph</p>
<script>alert('XSS');</script>
<img onerror="alert('XSS')" src="safe.jpg">`;

      const { container } = render(<MessageMarkdown allowHtml={true}>{maliciousInput}</MessageMarkdown>);

      // Safe elements should be preserved
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.textContent).toContain("Safe paragraph");

      // Dangerous scripts should be removed
      expect(container.querySelector("script")).toBeNull();
      expect(container.innerHTML).not.toContain("alert('XSS')");

      // Event handlers should be stripped from elements
      const img = container.querySelector("img");
      if (img) {
        expect(img.getAttribute("onerror")).toBeNull();
        expect(img.getAttribute("src")).toBe("safe.jpg");
      }
    });

    it("strips all HTML content when allowHtml is false", () => {
      const htmlInput = `<h1>Title</h1>
<p>Paragraph with <strong>bold</strong> text</p>
<script>alert('XSS');</script>`;

      const { container } = render(<MessageMarkdown allowHtml={false}>{htmlInput}</MessageMarkdown>);

      // No HTML elements should be rendered
      expect(container.querySelector("h1")).toBeNull();
      expect(container.querySelector("p")).toBeNull();
      expect(container.querySelector("strong")).toBeNull();
      expect(container.querySelector("script")).toBeNull();

      // Text content should be preserved
      expect(container.textContent).toContain("Title");
      expect(container.textContent).toContain("Paragraph");
      expect(container.textContent).toContain("bold");
    });
  });

  describe("🔗 URL Auto-linking with Security", () => {
    it("auto-links HTTP/HTTPS URLs with security attributes", () => {
      const text = "Visit https://example.com for more info";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const link = container.querySelector("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe("https://example.com");

      // Security attributes are automatically applied
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("handles multiple URLs in text with proper security", () => {
      const text = "Check out http://test.com and https://secure.com for info";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const links = container.querySelectorAll("a");
      expect(links).toHaveLength(2);
      expect(links[0]?.getAttribute("href")).toBe("http://test.com");
      expect(links[1]?.getAttribute("href")).toBe("https://secure.com");

      // All auto-linked URLs get security attributes
      Array.from(links).forEach((link) => {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      });
    });

    it("respects existing markdown links and doesn't double-link", () => {
      const text = "[Visit https://example.com](https://example.com)";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const links = container.querySelectorAll("a");
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("href")).toBe("https://example.com");
      expect(links[0]?.textContent).toBe("Visit https://example.com");
    });

    it("handles URLs with complex punctuation correctly", () => {
      const text = "API endpoint: https://api.example.com/v1/users?active=true&limit=10. More text.";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const link = container.querySelector("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe("https://api.example.com/v1/users?active=true&limit=10");
      expect(container.textContent).toContain(". More text.");
    });

    it("only auto-links safe protocols (http/https)", () => {
      const text = "Safe: https://example.com but not javascript:alert('xss') or data:text/html,<script>";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const links = container.querySelectorAll("a");
      const hrefs = Array.from(links).map((link) => link.getAttribute("href"));

      // Should only link the HTTPS URL
      expect(hrefs.filter((href) => href?.startsWith("https:"))).toHaveLength(1);
      expect(hrefs.filter((href) => href?.startsWith("javascript:"))).toHaveLength(0);
      expect(hrefs.filter((href) => href?.startsWith("data:"))).toHaveLength(0);
    });
  });

  describe("📝 Word Break Enhancement", () => {
    it("adds word break opportunities after slashes for better text wrapping", () => {
      const text = "https://very-long-domain-name.com/very/long/path/to/some/resource";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const wbrElements = container.querySelectorAll("wbr");
      expect(wbrElements.length).toBeGreaterThan(0);
    });

    it("handles multiple consecutive slashes", () => {
      const text = "path//with//double//slashes";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const wbrElements = container.querySelectorAll("wbr");
      expect(wbrElements.length).toBeGreaterThan(0);
    });

    it("doesn't add breaks to normal text without slashes", () => {
      const text = "This is normal text without any special characters that need breaking";
      const { container } = render(<MessageMarkdown>{text}</MessageMarkdown>);

      const wbrElements = container.querySelectorAll("wbr");
      expect(wbrElements.length).toBe(0);
    });
  });

  describe("🧩 Custom Components Integration", () => {
    it("accepts and renders custom components correctly", () => {
      const customComponents = {
        h1: ({ children, ...props }: any) => (
          <h1 className="custom-heading" data-testid="custom-h1" {...props}>
            {children}
          </h1>
        ),
      };

      const { container } = render(<MessageMarkdown components={customComponents}># Custom Heading</MessageMarkdown>);

      const heading = container.querySelector("h1");
      expect(heading).toBeTruthy();
      expect(heading).toHaveClass("custom-heading");
      expect(heading).toHaveAttribute("data-testid", "custom-h1");
    });

    it("maintains security features when using custom components", () => {
      const customComponents = {
        p: ({ children, ...props }: any) => (
          <p className="custom-paragraph" {...props}>
            {children}
          </p>
        ),
      };

      const { container } = render(
        <MessageMarkdown components={customComponents}>Visit https://example.com for info</MessageMarkdown>,
      );

      // Auto-linking still works with custom components
      const link = container.querySelector("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toBe("noopener noreferrer");

      // Custom paragraph component is used
      const paragraph = container.querySelector("p");
      expect(paragraph).toHaveClass("custom-paragraph");
    });
  });

  describe("⚡ Performance & Edge Cases", () => {
    it("handles malformed markdown gracefully without crashing", () => {
      const malformedContent = `# Unclosed heading
**Bold without closing asterisk
[Link without closing bracket
> Blockquote that continues
Normal text after malformed syntax`;

      const { container } = render(<MessageMarkdown>{malformedContent}</MessageMarkdown>);

      // Should render without crashing
      expect(container.textContent).toContain("Unclosed heading");
      expect(container.textContent).toContain("Normal text after malformed syntax");
    });

    it("processes large content efficiently", () => {
      const largeContent = `${"Repeated text content. ".repeat(
        500,
      )}With a URL: https://example.com/very/long/path/segments ${"And more text. ".repeat(500)}`;

      const { container } = render(<MessageMarkdown>{largeContent}</MessageMarkdown>);

      // Should handle large content
      expect(container.textContent).toContain("Repeated text content.");

      // Should still auto-link URLs
      const link = container.querySelector("a");
      expect(link).toBeTruthy();

      // Should add word breaks for long paths
      const wbrElements = container.querySelectorAll("wbr");
      expect(wbrElements.length).toBeGreaterThan(0);
    });

    it("correctly processes mixed content types", () => {
      const mixedContent = `# Markdown Title

Regular paragraph with **bold** and *italic* text.

Visit https://example.com/api/v1/endpoint for the API.

Another paragraph with a long path: /very/long/file/system/path/to/resource`;

      const { container } = render(<MessageMarkdown>{mixedContent}</MessageMarkdown>);

      // All markdown should render
      expect(container.querySelector("h1")).toBeTruthy();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("em")).toBeTruthy();

      // URLs should be auto-linked
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("https://example.com/api/v1/endpoint");
      expect(link?.getAttribute("target")).toBe("_blank");

      // Word breaks should be added
      const wbrElements = container.querySelectorAll("wbr");
      expect(wbrElements.length).toBeGreaterThan(0);
    });
  });

  describe("🛡️ Security Validation", () => {
    it("demonstrates the component is not vulnerable to common XSS attacks", () => {
      const xssAttempts = [
        `<script>alert('XSS')</script>`,
        `<img src="x" onerror="alert('XSS')">`,
        `<iframe src="javascript:alert('XSS')"></iframe>`,
        `<object data="data:text/html,<script>alert('XSS')</script>"></object>`,
        `<link rel="stylesheet" href="javascript:alert('XSS')">`,
      ];

      xssAttempts.forEach((xssAttempt) => {
        const { container } = render(<MessageMarkdown allowHtml={true}>{xssAttempt}</MessageMarkdown>);

        // No dangerous elements should be created
        expect(container.querySelector("script")).toBeNull();
        expect(container.querySelector("iframe")).toBeNull();
        expect(container.querySelector("object")).toBeNull();
        expect(container.querySelector("link")).toBeNull();
        expect(container.querySelector("style")).toBeNull();

        // No executable JavaScript should remain
        expect(container.innerHTML).not.toContain("alert(");
      });
    });

    it("validates that all auto-linked URLs have proper security attributes", () => {
      const textWithMultipleUrls = `Check these sites: https://example.com and http://test.org and https://api.service.com/v1/data?param=value for testing.`;

      const { container } = render(<MessageMarkdown>{textWithMultipleUrls}</MessageMarkdown>);

      const links = container.querySelectorAll("a");
      expect(links.length).toBeGreaterThan(0);

      // Every auto-linked URL must have security attributes
      Array.from(links).forEach((link) => {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");

        const href = link.getAttribute("href");
        expect(href).toMatch(/^https?:\/\//);
      });
    });
  });
});
