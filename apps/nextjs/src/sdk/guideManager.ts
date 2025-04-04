import confetti from "canvas-confetti";
import type { DomTrackingData } from "./domTree";

export class GuideManager {
  private helperHandElement: HTMLDivElement | null = null;
  private lastDomTracking: any = null;

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

  public animateHandToElement(index: number): Promise<boolean> {
    return new Promise((resolve) => {
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

      const xpath = domTrackingElement.xpath;
      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue as HTMLElement;

      if (!element) {
        resolve(false);
        return;
      }

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

  public async clickElement(index: number): Promise<boolean> {
    this.createHelperHand();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const domTracking = this.lastDomTracking;
    if (!domTracking) return false;

    const element = this.fetchElementByIndex(index);
    if (!element) return false;

    await this.animateHandToElement(index);

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
      await this.animateHandToElement(index);

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
    await this.animateHandToElement(index);
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
    // Fire some celebratory confetti
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

  public destroy(): void {
    if (this.helperHandElement) {
      document.body.removeChild(this.helperHandElement);
    }
  }
}

export default GuideManager;
