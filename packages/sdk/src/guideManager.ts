/* eslint-disable no-console */
import type { record } from "@rrweb/record";
import type { eventWithTime } from "@rrweb/types";
import scrollIntoView from "scroll-into-view-if-needed";
import { domElements } from "./domElements";
import { clickableElementsToString, constructDomTree, findInteractiveElements, type DomTrackingData } from "./domTree";
import { scriptOrigin } from "./scriptOrigin";
import { RESUME_GUIDE, type GuideSessionEventType } from "./utils";

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

class GuideManager {
  private helperHandElement: HTMLDivElement | null = null;
  private lastDomTracking: any = null;
  private events: eventWithTime[] = [];
  private stopFn: ReturnType<typeof record> | null = null;
  private flushInterval: number | null = null;
  private sessionId: string | null = null;
  private sessionToken: string | null = null;
  private isRecording = false;
  private widget: any; // Reference to HelperWidget instance
  private isRunning = false;

  private readonly SEND_FREQUENCY = 5000;
  private readonly MAX_EVENTS_BEFORE_FLUSH = 50;
  private readonly SESSION_ID_STORAGE_KEY = "helper_guide_session_id";
  private readonly SESSION_TOKEN_STORAGE_KEY = "helper_guide_session_token";

  constructor(widgetInstance: any) {
    this.widget = widgetInstance;
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

    const { backgroundColor, foregroundColor } = this.widget.getIconColors();

    this.helperHandElement.innerHTML = `
      <svg width="36" height="39" viewBox="0 0 26 29" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.9885 19.1603C14.4462 16.4526 25.36 8.80865 25.36 8.80865L22.5717 4.78239C22.5717 4.78239 18.2979 8.46521 15.1353 12.7541C14.4648 13.7215 13.1488 12.9234 13.9447 11.5515C15.9064 8.16995 21.5892 2.70127 21.5892 2.70127L17.2712 0.54569C17.2712 0.54569 14.458 3.38303 10.9133 10.5004C10.2651 11.8018 8.94659 11.1429 9.39493 9.80167C10.5422 6.36947 14.2637 0.913031 14.2637 0.913031L9.74091 0.17627C9.74091 0.17627 7.30141 4.59585 5.78539 10.0891C5.46118 11.2634 4.04931 10.9838 4.2171 9.81717C4.50759 7.79708 6.51921 1.95354 6.51921 1.95354L2.60762 1.97033C2.60762 1.97033 -0.737277 9.78607 1.7329 18.4073C3.13956 23.3167 7.54191 28.1763 13.287 28.1763C18.9209 28.1763 23.8513 23.8362 25.5294 17.1416L21.6221 14.1778C21.6221 14.1778 19.4441 21.7758 16.9885 19.1603Z" fill="${foregroundColor}"/>
      </svg>
    `;

    this.helperHandElement.style.backgroundColor = backgroundColor;
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
      const hand = this.createHelperHand();
      const rect = element.getBoundingClientRect();

      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      const isElementBehindWidget = this.isElementBehindWidget(element);

      if (isElementBehindWidget) {
        this.temporarilyHideWidget();
      } else {
        this.showWidgetAgain();
      }

      hand.classList.add("animating", "visible");
      hand.style.left = `${targetX}px`;
      hand.style.top = `${targetY}px`;

      setTimeout(() => {
        hand.classList.add("clicking");

        setTimeout(() => {
          hand.classList.remove("clicking");
          resolve(true);
        }, 200);
      }, 600);
    });
  }

  private isElementBehindWidget(element: HTMLElement): boolean {
    const widgetWrapper = document.querySelector(".helper-widget-wrapper")!;
    if (!widgetWrapper?.classList.contains("visible")) return false;

    const elementRect = element.getBoundingClientRect();
    const wrapperRect = widgetWrapper.getBoundingClientRect();

    return !(
      elementRect.right < wrapperRect.left ||
      elementRect.left > wrapperRect.right ||
      elementRect.bottom < wrapperRect.top ||
      elementRect.top > wrapperRect.bottom
    );
  }

  private temporarilyHideWidget(): boolean {
    if (this.widget?.isWidgetVisible()) {
      this.widget.hideWidgetTemporarily();
      return true;
    }
    return false;
  }

  private showWidgetAgain(): void {
    this.widget?.showWidgetAfterAnimation();
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
    if (!xpath || xpath.trim().length === 0) return null;

    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    return element as HTMLElement;
  }

  public async executeDOMAction(actionType: string, params: any, currentState: any): Promise<boolean | string> {
    if (!this.isRunning) {
      return false;
    }

    const pageDetails = this.fetchCurrentPageDetails();

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

    let result: boolean | string = false;

    switch (actionType) {
      case "click_element":
        result = await this.clickElement(params.index);
        break;
      case "select_option":
        result = await this.selectDropdownOption(params.index, params.text);
        break;
      case "input_text":
        result = await this.inputText(params.index, params.text);
        break;
      case "get_dropdown_options":
        result = this.getDropdownOptions(params.index);
        break;
      case "send_keys":
        result = await this.sendKeys(params.index, params.text);
        break;
      case "scroll_to_element":
        result = await this.scrollToElement(params.index);
        break;
      case "go_back":
        window.history.back();
        result = true;
        break;
      case "wait":
        await wait(params.seconds * 1000);
        result = true;
        break;
    }

    if (result == true) {
      const newPageDetails = this.fetchCurrentPageDetails();

      await this.sendGuideEvent("action_performed", {
        actionType,
        params,
        result: result ? "Performed" : "Failed",
        currentState,
        previousPageDetails: {
          url: pageDetails?.currentPageDetails.url,
          title: pageDetails?.currentPageDetails.title,
          elements: pageDetails?.clickableElements,
        },
        newPageDetails: {
          url: newPageDetails?.currentPageDetails.url,
          title: newPageDetails?.currentPageDetails.title,
          elements: newPageDetails?.clickableElements,
        },
      });
    }

    return result;
  }

  private takeDOMSnapshot(
    debugMode = false,
    doHighlightElements = false,
    focusHighlightIndex = -1,
    viewportExpansion = 0,
  ) {
    return domElements({
      debugMode,
      doHighlightElements,
      focusHighlightIndex,
      viewportExpansion,
      onlyVisibleElements: true,
    });
  }

  public fetchCurrentPageDetails(): {
    currentPageDetails: { url: string; title: string };
    clickableElements?: string;
    interactiveElements?: ReturnType<typeof findInteractiveElements>;
  } {
    const domTracking = this.takeDOMSnapshot();
    this.setDomTracking(domTracking);

    const currentPageDetails = {
      url: window.location.href,
      title: document.title,
    };

    try {
      const domTree = constructDomTree(domTracking as DomTrackingData);

      const includeAttributes = [
        "title",
        "type",
        "name",
        "role",
        "tabindex",
        "aria-label",
        "placeholder",
        "value",
        "required",
        "alt",
        "aria-expanded",
      ];

      const clickableElements = clickableElementsToString(domTree.root, includeAttributes);
      const interactiveElements = findInteractiveElements(domTree.root);

      return {
        currentPageDetails,
        clickableElements,
        interactiveElements,
      };
    } catch (error) {
      console.error("Failed to construct DOM tree:", error);
      return { currentPageDetails };
    }
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
    if (!this.isRunning) {
      return false;
    }

    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    scrollIntoView(element, { behavior: "auto", block: "center", inline: "center" });
    await wait(1500);

    return true;
  }

  public async sendKeys(index: number, text: string): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    const element = this.fetchElementByIndex(index);
    if (!element || !(element instanceof HTMLElement)) return false;

    await this.animateHandToElementAndScroll(index);

    element.focus();

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      if (!nativeInputValueSetter) {
        console.error("Could not get native value setter");
        return false;
      }

      const newValue = element.value + text;
      nativeInputValueSetter.call(element, newValue);

      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: false }));
    } else {
      console.warn("sendKeys called on non-input/textarea element:", element);
      return false;
    }
    return true;
  }

  public async inputText(index: number, text: string): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    const element = this.fetchElementByIndex(index);
    if (!element || !(element instanceof HTMLElement)) return false;

    await this.animateHandToElementAndScroll(index);

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;

      if (!nativeInputValueSetter) {
        console.error("Could not get native value setter");
        return false;
      }

      element.focus();
      const hasTab = text.endsWith("[Tab]");
      const actualText = hasTab ? text.slice(0, -5) : text;

      nativeInputValueSetter.call(element, actualText);
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: false }));

      if (hasTab) {
        const focusableSelector = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(document.querySelectorAll(focusableSelector)).filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null,
        );

        const currentIndex = focusableElements.indexOf(element);
        if (currentIndex !== -1 && currentIndex + 1 < focusableElements.length) {
          focusableElements[currentIndex + 1]?.focus();
        } else if (focusableElements.length > 0) {
          focusableElements[0]?.focus();
        }
      }

      await wait(1000);
      return true;
    }

    return false;
  }

  public async clickElement(index: number): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    this.createHelperHand();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const domTracking = this.lastDomTracking;
    if (!domTracking) return false;

    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    await this.animateHandToElementAndScroll(index);
    element.click();
    return true;
  }

  public async selectDropdownOption(index: number, text: string): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    this.createHelperHand();
    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    if (element instanceof HTMLSelectElement) {
      await this.animateHandToElementAndScroll(index);

      const options = Array.from(element.options);
      const option = options.find((opt) => opt.text === text || opt.value === text);

      if (option) {
        element.value = option.value;

        const event = new Event("change", { bubbles: true });
        element.dispatchEvent(event);
        return true;
      }
      return false;
    }

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

  public cancel(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stopRecording();
    this.hideHelperHand();
    this.showWidgetAgain();
    this.endGuideSession();
  }

  public done(success: boolean, message?: string): void {
    this.sendGuideEvent("completed", {
      title: document.title,
      url: window.location.href,
      success,
      message,
    });
    this.stopRecording();
    this.hideHelperHand();
    this.showWidgetAgain();
    this.endGuideSession();
  }

  public endGuideSession(): void {
    this.isRunning = false;
    this.clearSession();
  }

  public async startRecording(): Promise<void> {
    if (this.stopFn) return;

    this.isRecording = true;

    try {
      const { record } = await import("@rrweb/record");
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
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.isRecording = false;
      this.stopFn = null;
      throw error;
    }
  }

  public async stopRecording(): Promise<void> {
    if (!this.stopFn) {
      return;
    }

    this.stopFn();
    this.stopFn = null;
    this.isRecording = false;

    this.stopAutoFlush();

    if (this.events.length > 0) {
      await this.flush();
    }
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
      const response = await fetch(`${scriptOrigin}/api/guide/event`, {
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
    } catch (error) {
      console.error("Failed to send events:", error);
      throw error;
    }
  }

  public start(sessionToken: string, sessionId: string): void {
    this.isRunning = true;
    this.sessionToken = sessionToken;
    this.sessionId = sessionId;
    localStorage.setItem(this.SESSION_ID_STORAGE_KEY, sessionId);
    localStorage.setItem(this.SESSION_TOKEN_STORAGE_KEY, sessionToken);
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

  public clearSession(): void {
    localStorage.removeItem(this.SESSION_ID_STORAGE_KEY);
    localStorage.removeItem(this.SESSION_TOKEN_STORAGE_KEY);
  }

  public getPreviousSessionId(): string | null {
    return localStorage.getItem(this.SESSION_ID_STORAGE_KEY);
  }

  public getPreviousSessionToken(): string | null {
    return localStorage.getItem(this.SESSION_TOKEN_STORAGE_KEY);
  }

  public async checkForResumableGuideSession(): Promise<void> {
    const storedSessionId = this.getPreviousSessionId();
    const storedToken = this.getPreviousSessionToken();

    if (storedSessionId && storedToken) {
      await this.resumeGuideSession(storedSessionId, storedToken);
    }
  }

  public async sendGuideEvent(type: GuideSessionEventType, data: Record<string, unknown>): Promise<void> {
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
      const response = await fetch(`${scriptOrigin}/api/guide/event`, {
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
    } catch (error) {
      console.error("Failed to send guide event:", error);
    }
  }

  public async resumeGuideSession(sessionId: string, token: string): Promise<void> {
    try {
      const response = await fetch(`${scriptOrigin}/api/guide/resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 401 || response.status === 403) {
          this.clearSession();
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
      }

      const sessionData = await response.json();

      this.start(token, sessionId);

      this.widget.sendMessageToEmbed({
        action: RESUME_GUIDE,
        content: {
          ...sessionData,
          token,
        },
      });

      this.widget.showInternal();

      const newPageDetails = this.fetchCurrentPageDetails();
      await this.sendGuideEvent("resumed", {
        pageDetails: {
          url: newPageDetails.currentPageDetails.url,
          title: newPageDetails.currentPageDetails.title,
        },
      });
    } catch (error) {
      this.clearSession();
    }
  }
}

export default GuideManager;
