/* eslint-disable no-console */
import { record } from "@rrweb/record";
import type { eventWithTime } from "@rrweb/types";
import userEvent from "@testing-library/user-event";
import confetti from "canvas-confetti";
import scrollIntoView from "scroll-into-view-if-needed";
import type { guideSessionEventTypeEnum } from "@/db/schema/guideSession";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchElementByXpath = (xpath: string) => {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue as HTMLElement;
};

const isVisible = (element: HTMLElement) => {
  // Check if element exists
  if (!element) return false;

  // Check if element has zero dimensions
  if (element.offsetWidth === 0 || element.offsetHeight === 0) {
    return false;
  }

  // Check computed styles for visibility
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.display === "none" || computedStyle.visibility === "hidden" || computedStyle.opacity === "0") {
    return false;
  }

  // Check if element is outside the document bounds
  const rect = element.getBoundingClientRect();
  if (
    rect.bottom < 0 ||
    rect.top > (window.innerHeight || document.documentElement.clientHeight) ||
    rect.right < 0 ||
    rect.left > (window.innerWidth || document.documentElement.clientWidth)
  ) {
    return false;
  }

  // Check if any parent is hiding overflow or has zero dimensions
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);

    // Check if parent is hidden
    if (
      parentStyle.display === "none" ||
      parentStyle.visibility === "hidden" ||
      parentStyle.opacity === "0" ||
      parent.offsetWidth === 0 ||
      parent.offsetHeight === 0
    ) {
      return false;
    }

    // For scrollable parents, check if element is within scrollable area
    const isScrollable =
      ["auto", "scroll"].includes(parentStyle.overflowY) || ["auto", "scroll"].includes(parentStyle.overflowX);

    if (isScrollable) {
      const parentRect = parent.getBoundingClientRect();

      // Calculate the visible boundaries of the scrollable parent
      const visibleTop = Math.max(parentRect.top, 0);
      const visibleBottom = Math.min(parentRect.bottom, window.innerHeight);
      const visibleLeft = Math.max(parentRect.left, 0);
      const visibleRight = Math.min(parentRect.right, window.innerWidth);

      // Check if element is outside of parent's visible boundaries
      if (
        rect.bottom < visibleTop ||
        rect.top > visibleBottom ||
        rect.right < visibleLeft ||
        rect.left > visibleRight
      ) {
        // Check if element is outside parent's scrollable area
        if (
          rect.bottom < parent.scrollTop ||
          rect.top > parent.scrollTop + parent.clientHeight ||
          rect.right < parent.scrollLeft ||
          rect.left > parent.scrollLeft + parent.clientWidth
        ) {
          return false;
        }
      }
    }

    parent = parent.parentElement;
  }

  return true;
};

export class GuideManager {
  private helperHandElement: HTMLDivElement | null = null;
  private lastDomTracking: any = null;
  private events: eventWithTime[] = [];
  private stopFn: ReturnType<typeof record> | null = null;
  private flushInterval: number | null = null;
  private sessionId: string | null = null;
  private sessionToken: string | null = null;
  private isRecording = false;

  // Constants for recording
  private readonly SEND_FREQUENCY = 5000; // 5 seconds
  private readonly MAX_EVENTS_BEFORE_FLUSH = 50;

  constructor() {
    this.helperHandElement = null;
    this.lastDomTracking = null;
  }

  public setDomTracking(domTracking: any): void {
    this.lastDomTracking = domTracking;
  }

  public createHelperHand(): HTMLDivElement {
    if (this.helperHandElement) return this.helperHandElement;

    this.helperHandElement = document.createElement("div");
    this.helperHandElement.className = "helper-guide-hand";
    this.helperHandElement.innerHTML = `
      <svg width="36" height="39" viewBox="0 0 26 29" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.9885 19.1603C14.4462 16.4526 25.36 8.80865 25.36 8.80865L22.5717 4.78239C22.5717 4.78239 18.2979 8.46521 15.1353 12.7541C14.4648 13.7215 13.1488 12.9234 13.9447 11.5515C15.9064 8.16995 21.5892 2.70127 21.5892 2.70127L17.2712 0.54569C17.2712 0.54569 14.458 3.38303 10.9133 10.5004C10.2651 11.8018 8.94659 11.1429 9.39493 9.80167C10.5422 6.36947 14.2637 0.913031 14.2637 0.913031L9.74091 0.17627C9.74091 0.17627 7.30141 4.59585 5.78539 10.0891C5.46118 11.2634 4.04931 10.9838 4.2171 9.81717C4.50759 7.79708 6.51921 1.95354 6.51921 1.95354L2.60762 1.97033C2.60762 1.97033 -0.737277 9.78607 1.7329 18.4073C3.13956 23.3167 7.54191 28.1763 13.287 28.1763C18.9209 28.1763 23.8513 23.8362 25.5294 17.1416L21.6221 14.1778C21.6221 14.1778 19.4441 21.7758 16.9885 19.1603Z" fill="#000"/>
      </svg>
    `;

    this.helperHandElement.style.left = "50%";
    this.helperHandElement.style.top = "50%";
    this.helperHandElement.classList.remove("animating", "clicking");
    this.helperHandElement.classList.add("visible");

    document.body.appendChild(this.helperHandElement);
    return this.helperHandElement;
  }

  // eslint-disable-next-line require-await
  public async animateHandToElementAndScroll(index: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      const domTracking = this.lastDomTracking;
      if (!domTracking) {
        resolve(false);
        return;
      }

      const elements = Object.values(domTracking.map);
      const domTrackingElement = elements.find((element: any) => element.highlightIndex === index) as Record<
        string,
        any
      >;

      if (!domTrackingElement) {
        resolve(false);
        return;
      }

      let element = fetchElementByXpath(domTrackingElement.xpath);
      if (!element) {
        resolve(false);
        return;
      }

      if (!isVisible(element)) {
        scrollIntoView(element, {
          behavior: "auto",
          block: "center",
          inline: "center",
        });
        await wait(1500);
      }

      element = fetchElementByXpath(domTrackingElement.xpath);
      console.log("element after scroll", element.getBoundingClientRect());

      const hand = this.createHelperHand();
      const rect = element.getBoundingClientRect();

      // Target position (center of the element)
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      hand.classList.add("animating", "visible");
      hand.style.left = `${targetX}px`;
      hand.style.top = `${targetY}px`;

      // Simulate clicking after the hand reaches the element
      setTimeout(() => {
        hand.classList.add("clicking");

        setTimeout(() => {
          hand.classList.remove("clicking");
          resolve(true);
        }, 200);
      }, 600);
    });
  }

  public hideHelperHand(): void {
    if (this.helperHandElement) {
      this.helperHandElement.classList.remove("visible");
    }
  }

  public fetchElementByIndex(index: number): HTMLElement | null {
    const elements = Object.values(this.lastDomTracking.map);
    const domTrackingElement = elements.find((element: any) => element.highlightIndex === index) as Record<string, any>;

    if (!domTrackingElement) return null;

    const xpath = domTrackingElement.xpath;
    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    return element as HTMLElement;
  }

  public async executeDOMAction(actionType: string, params: any, currentState: any): Promise<boolean | string> {
    const supported = [
      "click_element",
      "select_option",
      "input_text",
      "get_dropdown_options",
      "send_keys",
      "scroll_to_element",
      "go_back",
      "wait",
    ];

    if (!supported.includes(actionType)) {
      console.warn(`Unknown action type: ${actionType}`);
      return false;
    }

    await this.sendGuideEvent("action_performed", {
      actionType,
      params,
      currentState,
    });

    switch (actionType) {
      case "click_element":
        return await this.clickElement(params.index);
      case "select_option":
        return await this.selectDropdownOption(params.index, params.text);
      case "input_text":
        return await this.inputText(params.index, params.text);
      case "get_dropdown_options":
        return this.getDropdownOptions(params.index);
      case "send_keys":
        return await this.sendKeys(params.index, params.text);
      case "scroll_to_element":
        return await this.scrollToElement(params.index);
      case "go_back":
        window.history.back();
        return true;
      case "wait":
        await wait(params.seconds * 1000);
        return true;
    }

    return false;
  }

  public getDropdownOptions(index: number): string | boolean {
    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    if (element instanceof HTMLSelectElement) {
      const options = Array.from(element.options);
      return options.map((option) => option.text).join(", ");
    }
    return false;
  }

  public async scrollToElement(index: number): Promise<boolean> {
    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    scrollIntoView(element, { behavior: "auto", block: "center", inline: "center" });
    await wait(1500);

    return true;
  }

  public async sendKeys(index: number, text: string): Promise<boolean> {
    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    await this.animateHandToElementAndScroll(index);
    userEvent.type(element, text);
    return true;
  }

  public async inputText(index: number, text: string): Promise<boolean> {
    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    await this.animateHandToElementAndScroll(index);
    console.log("input text element", element);

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      userEvent.type(element, `${text}[Tab]`);
      await wait(1000);
      return true;
    }

    return false;
  }

  public async clickElement(index: number): Promise<boolean> {
    this.createHelperHand();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const domTracking = this.lastDomTracking;
    if (!domTracking) return false;

    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    await this.animateHandToElementAndScroll(index);

    console.log("clicking element", element);
    element.click();
    return true;
  }

  public async selectDropdownOption(index: number, text: string): Promise<boolean> {
    this.createHelperHand();
    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    // Check if it's a select element
    if (element instanceof HTMLSelectElement) {
      await this.animateHandToElementAndScroll(index);

      // Find the option with matching text
      const options = Array.from(element.options);
      const option = options.find((opt) => opt.text === text || opt.value === text);

      if (option) {
        // Set the value and dispatch change event
        element.value = option.value;

        // Dispatch change event to trigger any listeners
        const event = new Event("change", { bubbles: true });
        element.dispatchEvent(event);
        return true;
      }
      return false;
    }

    // For non-select elements (like custom dropdowns), fall back to click
    await this.animateHandToElementAndScroll(index);
    element.click();
    return true;
  }

  public connectExistingStartGuideElements(callback: (event: MouseEvent) => void): void {
    document.querySelectorAll("[data-helper-start-guide]").forEach((element) => {
      this.connectStartGuideElement(element, callback);
    });
  }

  public connectStartGuideElement(element: Element, callback: (event: MouseEvent) => void): void {
    element.addEventListener("click", (event: Event) => callback(event as MouseEvent));
  }

  public celebrateGuideDone(): void {
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];

    (function frame() {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });

      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  public done(): void {
    this.sendGuideEvent("completed", {
      title: document.title,
      url: window.location.href,
    });
    this.stopRecording();
    this.hideHelperHand();
    this.celebrateGuideDone();
  }

  public startRecording(): Promise<void> {
    if (this.stopFn) {
      return Promise.resolve();
    }

    this.isRecording = true;

    try {
      this.stopFn = record({
        emit: (event: eventWithTime) => {
          this.events.push(event);

          if (this.events.length >= this.MAX_EVENTS_BEFORE_FLUSH) {
            this.flush().catch(console.error);
          }
        },
        blockClass: "helper-block",
        ignoreClass: "helper-ignore",
        maskTextClass: "helper-mask",
        maskAllInputs: false,
        inlineStylesheet: true,
        recordCanvas: false,
        collectFonts: false,
      });

      this.startAutoFlush();

      console.log("Recording started with sessionId:", this.sessionId);
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.isRecording = false;
      this.stopFn = null;
      return Promise.reject(error);
    }
  }

  public async stopRecording(): Promise<void> {
    if (!this.stopFn) {
      return; // Not recording
    }

    // Stop recording
    this.stopFn();
    this.stopFn = null;
    this.isRecording = false;

    // Stop auto-flush
    this.stopAutoFlush();

    // Flush remaining events
    if (this.events.length > 0) {
      await this.flush();
    }

    console.log("Recording stopped");
  }

  private startAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = window.setInterval(() => {
      if (this.events.length > 0) {
        this.flush().catch(console.error);
      }
    }, this.SEND_FREQUENCY);
  }

  private stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  public async flush(): Promise<void> {
    if (this.events.length === 0 || !this.sessionId) {
      return;
    }

    const eventsToSend = [...this.events];

    try {
      const response = await fetch("/api/guide/event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isRecording: true,
          sessionId: this.sessionId,
          events: eventsToSend,
          metadata: {
            url: window.location.href,
            title: document.title,
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.events = this.events.slice(eventsToSend.length);
      console.log("Events sent successfully:", eventsToSend.length);
    } catch (error) {
      console.error("Failed to send events:", error);
      throw error;
    }
  }

  public start(sessionToken: string, sessionId: string): void {
    this.sessionToken = sessionToken;
    this.sessionId = sessionId;
    this.startRecording().catch(console.error);
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public destroy(): void {
    if (this.helperHandElement) {
      document.body.removeChild(this.helperHandElement);
    }

    if (this.isRecording) {
      this.stopRecording().catch(console.error);
    }
  }

  public async sendGuideEvent(
    type: (typeof guideSessionEventTypeEnum.enumValues)[number],
    data: Record<string, unknown>,
  ): Promise<void> {
    if (!this.sessionId || !this.sessionToken) {
      console.error("Cannot send guide event: session not started.");
      return;
    }

    const eventPayload = {
      type,
      timestamp: Date.now(),
      data,
    };

    try {
      const response = await fetch("/api/guide/event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isRecording: false,
          sessionId: this.sessionId,
          events: [eventPayload],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Guide event sent successfully:", type);
    } catch (error) {
      console.error("Failed to send guide event:", error);
    }
  }
}

export default GuideManager;
