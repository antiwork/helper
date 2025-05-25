import { afterEach, beforeEach, describe, expect, inject, it, vi } from "vitest";
import { proxyExternalContent } from "@/lib/proxyExternalContent";

vi.mock("@/lib/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    PROXY_SECRET_KEY: "test-secret-key",
    PROXY_URL: "https://proxy.helperai.com",
    AUTH_URL: "https://helper.ai",
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.helperai.dev",
  },
}));

describe("proxyExternalContent", () => {
  const mockSignature = "mocked-signature";
  const mockExpires = 1234567890;

  beforeEach(() => {
    vi.spyOn(global.crypto.subtle, "importKey").mockResolvedValue({} as CryptoKey);
    vi.spyOn(global.crypto.subtle, "sign").mockResolvedValue(new ArrayBuffer(32));
    vi.spyOn(global, "btoa").mockReturnValue(mockSignature);
    vi.spyOn(Date, "now").mockReturnValue((mockExpires - 300) * 1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when input is null", async () => {
    const result = await proxyExternalContent(null);
    expect(result).toBeNull();
  });

  it("proxies external URLs in HTML content", async () => {
    const html = `
    <div class="media-examples">
      <div class="media-item">
        <h3>Image Example:</h3>
        <img
          src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809"
          alt="Colorful abstract gradient"
          width="400"
          height="300"
        />
      </div>

      <div class="media-item">
        <h3>Video Example:</h3>
        <video width="400" height="300" controls>
          <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>

      <div class="media-item">
        <h3>Responsive Image with srcset:</h3>
        <img
          src="https://images.unsplash.com/photo-1682687220063-4742bd7fd538"
          srcset="
            https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=400   400w,
            https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=800   800w,
            https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=1200 1200w
          "
          sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
          alt="Responsive image example"
          width="400"
        />
      </div>

      <div class="media-item">
        <h3>Background Image Example:</h3>
        <div
          style="
            width: 400px;
            height: 300px;
            background-image: url('https://images.unsplash.com/photo-1557682250-33bd709cbe85');
            background-size: cover;
            background-position: center;
            border-radius: 8px;
          "
        ></div>
      </div>
    </div>
    `;

    const result = await proxyExternalContent(html);

    expect(result).toContain(
      `<img src="https://proxy.helperai.com?url=${encodeURIComponent("https://images.unsplash.com/photo-1579546929518-9e396f3cc809")}&verify=${mockSignature}&expires=${mockExpires}"`,
    );
    expect(result).not.toContain("https://images.unsplash.com/photo-1579546929518-9e396f3cc809");

    expect(result).toContain(
      `<source src="https://proxy.helperai.com?url=${encodeURIComponent("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")}&verify=${mockSignature}&expires=${mockExpires}"`,
    );
    expect(result).not.toContain("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");

    expect(result).toContain(
      `https://proxy.helperai.com?url=${encodeURIComponent("https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=400")}&verify=${mockSignature}&expires=${mockExpires}`,
    );
    expect(result).not.toContain("https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=400");
    expect(result).toContain(
      `https://proxy.helperai.com?url=${encodeURIComponent("https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=800")}&verify=${mockSignature}&expires=${mockExpires}`,
    );
    expect(result).not.toContain("https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=800");
    expect(result).toContain(
      `https://proxy.helperai.com?url=${encodeURIComponent("https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=1200")}&verify=${mockSignature}&expires=${mockExpires}`,
    );
    expect(result).not.toContain("https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=1200");

    expect(result).toContain(
      `background-image: url(https://proxy.helperai.com?url=${encodeURIComponent("https://images.unsplash.com/photo-1557682250-33bd709cbe85")}&verify=${mockSignature}&expires=${mockExpires})`,
    );
    expect(result).not.toContain("https://images.unsplash.com/photo-1557682250-33bd709cbe85");
  });

  it("does not proxy URLs from excluded domains", async () => {
    const htmlWithExcludedUrls = `
      <img src="https://helper.ai/logo.png">
      <img src="https://proxy.helperai.com/existing-proxy.png">
      <img src="https://supabase.helperai.dev/bucket/image.jpg">
    `;

    const result = await proxyExternalContent(htmlWithExcludedUrls);

    expect(result).toContain('src="https://helper.ai/logo.png"');
    expect(result).toContain('src="https://proxy.helperai.com/existing-proxy.png"');
    expect(result).toContain('src="https://supabase.helperai.dev/bucket/image.jpg"');
  });

  it("does not proxy non-URL attributes", async () => {
    const htmlWithNonUrlAttributes = `
      <div title="This is a title with https://example.com in it">
        <a href="https://example.com" title="Example">Example</a>
      </div>
    `;

    const result = await proxyExternalContent(htmlWithNonUrlAttributes);

    expect(result).toContain('title="This is a title with https://example.com in it"');
    expect(result).toContain(`href="https://example.com"`);
  });
});
