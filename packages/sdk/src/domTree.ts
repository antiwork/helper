/**
 * DOM node types
 */
interface DOMTextNode {
  type: "TEXT_NODE";
  text: string;
  isVisible: boolean;
  parent?: DOMElementNode;
}

interface DOMElementNode {
  tagName: string;
  attributes: Record<string, string>;
  xpath: string;
  children: (DOMElementNode | DOMTextNode)[];
  isVisible?: boolean;
  isTopElement?: boolean;
  isInteractive?: boolean;
  isInViewport?: boolean;
  highlightIndex?: number;
  shadowRoot?: boolean;
  parent?: DOMElementNode;
}

type DOMNode = DOMElementNode | DOMTextNode;

type SelectorMap = Record<number, DOMElementNode>;

export interface DomTrackingData {
  rootId: string;
  map: Record<string, any>;
}

/**
 * Builds a DOM tree from the domTracking data
 * @param domTrackingData The data returned from domTracking
 * @returns The DOM tree and selector map
 */
export function constructDomTree(domTrackingData: DomTrackingData): { root: DOMElementNode; selectorMap: SelectorMap } {
  const jsNodeMap = domTrackingData.map;
  const jsRootId = domTrackingData.rootId;

  const selectorMap: SelectorMap = {};
  const nodeMap: Record<string, DOMNode> = {};

  // First pass: create all nodes
  for (const [id, nodeData] of Object.entries(jsNodeMap)) {
    const node = parseNode(nodeData);
    if (!node) continue;

    nodeMap[id] = node;

    // Add to selector map if it has a highlight index
    if ("highlightIndex" in node && node.highlightIndex !== undefined) {
      selectorMap[node.highlightIndex] = node;
    }
  }

  // Second pass: build parent-child relationships
  for (const [id, nodeData] of Object.entries(jsNodeMap)) {
    const node = nodeMap[id];
    if (!node || !("children" in nodeData)) continue;

    if ("children" in node) {
      const elementNode = node;

      // Add children
      for (const childId of nodeData.children) {
        if (!(childId in nodeMap)) continue;

        const childNode = nodeMap[childId];
        if (childNode) {
          childNode.parent = elementNode;
          elementNode.children.push(childNode);
        }
      }
    }
  }

  const root = nodeMap[jsRootId] as DOMElementNode;

  if (!root || typeof root !== "object" || !("tagName" in root)) {
    throw new Error("Failed to parse DOM tree: root element not found");
  }

  return { root, selectorMap };
}

/**
 * Parses a node from the node data
 * @param nodeData The node data
 * @returns The parsed node or null if the node should be skipped
 */
function parseNode(nodeData: any): DOMNode | null {
  if (!nodeData) return null;

  // Handle text nodes
  if (nodeData.type === "TEXT_NODE") {
    return {
      type: "TEXT_NODE",
      text: nodeData.text,
      isVisible: nodeData.isVisible,
    };
  }

  // Handle element nodes
  if (nodeData.tagName) {
    const node: DOMElementNode = {
      tagName: nodeData.tagName,
      attributes: nodeData.attributes || {},
      xpath: nodeData.xpath || "",
      children: [],
      isVisible: nodeData.isVisible,
      isTopElement: nodeData.isTopElement,
      isInteractive: nodeData.isInteractive,
      isInViewport: nodeData.isInViewport,
      highlightIndex: nodeData.highlightIndex,
      shadowRoot: nodeData.shadowRoot,
    };

    return node;
  }

  return null;
}

/**
 * Returns a flattened array of nodes in the DOM tree
 * @param root The root node
 * @returns Array of all nodes in the tree
 */
function flattenDomTree(root: DOMElementNode): DOMNode[] {
  const nodes: DOMNode[] = [root];

  function traverse(node: DOMNode) {
    if ("children" in node) {
      const elementNode = node;
      for (const child of elementNode.children) {
        nodes.push(child);
        traverse(child);
      }
    }
  }

  traverse(root);
  return nodes;
}

/**
 * Checks if a text node has a parent with a highlight index
 */
function hasParentWithHighlightIndex(node: DOMTextNode): boolean {
  let current = node.parent;
  while (current) {
    if (current.highlightIndex !== undefined) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Gets all text from an element until the next clickable element
 */
function getTextTillNextClickableElement(node: DOMElementNode, maxDepth = -1): string {
  const textParts: string[] = [];

  function collectText(currentNode: DOMNode, currentDepth: number): void {
    if (maxDepth !== -1 && currentDepth > maxDepth) {
      return;
    }

    // Skip this branch if we hit a highlighted element (except for the current node)
    if ("highlightIndex" in currentNode && currentNode !== node && currentNode.highlightIndex !== undefined) {
      return;
    }

    if ("type" in currentNode && currentNode.type === "TEXT_NODE") {
      textParts.push(currentNode.text);
    } else if ("children" in currentNode) {
      for (const child of currentNode.children) {
        collectText(child, currentDepth + 1);
      }
    }
  }

  collectText(node, 0);
  return textParts.join("\n").trim();
}

/**
 * Finds the text content of the label associated with an input element.
 * Checks parent first, then siblings with matching 'for' attribute.
 */
function getLabelTextForInput(inputNode: DOMElementNode): string | null {
  if (!inputNode || inputNode.tagName !== "input") {
    return null;
  }

  const parent = inputNode.parent;
  if (!parent) return null;

  if (parent.tagName === "label") {
    return getTextTillNextClickableElement(parent).trim();
  }

  // 2. Check for label with a matching 'for' attribute
  const inputId = inputNode.attributes.id;
  if (inputId) {
    // First check among siblings of the input
    for (const sibling of parent.children) {
      if (
        sibling !== inputNode &&
        "tagName" in sibling &&
        sibling.tagName === "label" &&
        sibling.attributes.for === inputId
      ) {
        return getTextTillNextClickableElement(sibling).trim();
      }
    }

    // If no label found among siblings, search through the entire parent's DOM subtree
    const allNodes = flattenDomTree(parent);
    for (const node of allNodes) {
      if ("tagName" in node && node !== inputNode && node.tagName === "label" && node.attributes.for === inputId) {
        return getTextTillNextClickableElement(node).trim();
      }
    }
  }

  // 3. Check for label that directly contains the input (without 'for' attribute)
  // This would handle cases like <label>Label text <input></label>
  if (parent.tagName === "label" || (parent.parent && parent.parent.tagName === "label")) {
    const labelNode = parent.tagName === "label" ? parent : parent.parent;
    if (labelNode) {
      // Extract text content excluding the input's text
      const labelText = getTextTillNextClickableElement(labelNode).trim();
      return labelText;
    }
  }

  // 4. If no explicit label, check if there's text preceding the input in the same container
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child === inputNode) {
      // Found our input, check if the previous sibling is a text node or has text
      if (i > 0) {
        const prevSibling = parent.children[i - 1];
        if (prevSibling && "type" in prevSibling && prevSibling.type === "TEXT_NODE") {
          return prevSibling.text.trim();
        } else if (
          prevSibling &&
          "tagName" in prevSibling &&
          !["input", "button", "select", "textarea"].includes(prevSibling.tagName)
        ) {
          return getTextTillNextClickableElement(prevSibling).trim();
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Recursively searches up the DOM tree to find a parent form element
 * and returns its name attribute. Works for any element type.
 */
function getFormName(element: DOMElementNode): string | null {
  if (!element) {
    return null;
  }
  let current = element.parent;
  while (current) {
    if (current.tagName === "form") {
      return current.attributes.name || null;
    }
    current = current.parent;
  }
  return null;
}

export type InteractiveElement = {
  index: number;
  element: DOMElementNode;
  description: string;
};

/**
 * Finds all interactive elements in the DOM tree
 * @param root The root node
 * @returns Array of interactive elements with their highlight indices and descriptions
 */
export function findInteractiveElements(root: DOMElementNode): InteractiveElement[] {
  const interactiveElements: InteractiveElement[] = [];

  function traverse(node: DOMNode): void {
    if ("tagName" in node) {
      // Check if the element is interactive and has a highlight index
      if (node.isInteractive && node.highlightIndex !== undefined) {
        // Create a description for the element
        let description = node.tagName;

        // Add key attributes if they exist
        const attributeKeys = ["id", "class", "role", "aria-label", "placeholder", "name", "type"];
        const attributes: string[] = [];

        for (const key of attributeKeys) {
          if (node.attributes[key]) {
            attributes.push(`${key}="${node.attributes[key]}"`);
          }
        }

        if (attributes.length > 0) {
          description += ` ${attributes.join(" ")}`;
        }

        // Add text content
        const text = getTextTillNextClickableElement(node);
        if (text) {
          description += ` with text "${text}"`;
        }

        interactiveElements.push({
          index: node.highlightIndex,
          element: node,
          description,
        });
      }

      // Traverse children
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return interactiveElements;
}

/**
 * Converts the DOM tree to a string representation focusing on clickable/interactive elements
 * This implementation closely matches the Python clickable_elements_to_string method
 * @param root The root element node
 * @param includeAttributes Optional list of attribute names to include
 * @returns Formatted string of clickable elements
 */
export function clickableElementsToString(root: DOMElementNode, includeAttributes?: string[]): string {
  const formattedText: string[] = [];

  function processNode(node: DOMNode, depth: number): void {
    if ("tagName" in node) {
      if (node.highlightIndex !== undefined) {
        const isInput = node.tagName === "input";
        const isButton = node.tagName === "button";
        const text = isInput ? "" : getTextTillNextClickableElement(node);
        const labelText = isInput ? getLabelTextForInput(node) : null;

        // Extract specific attributes for special handling
        const placeholder = node.attributes.placeholder;
        const type = node.attributes.type;
        const valueAttr = node.attributes.value;
        const isRequired = node.attributes.required !== undefined;
        const formName = isInput || isButton ? getFormName(node) : null;

        // Filter other attributes based on includeAttributes, excluding the specific ones
        let otherAttributesStr = "";
        if (includeAttributes && includeAttributes.length > 0) {
          const attributesToExclude = ["placeholder", "type", "value", "required"];
          if (isInput) attributesToExclude.push("label");
          if (isInput || isButton) attributesToExclude.push("form");
          const otherAttributes = Array.from(
            new Set(
              Object.entries(node.attributes)
                .filter(
                  ([key, attrValue]) =>
                    includeAttributes.includes(key) && !attributesToExclude.includes(key) && attrValue !== node.tagName,
                )
                .map(([_, attrValue]) => String(attrValue)),
            ),
          );

          // Remove text content from attributes if present (for non-inputs)
          if (!isInput && text && otherAttributes.includes(text)) {
            otherAttributes.splice(otherAttributes.indexOf(text), 1);
          }
          otherAttributesStr = otherAttributes.join(";");
        }

        let line = `[${node.highlightIndex}]<${node.tagName}`;

        // Append specific attributes
        if (isInput && labelText) line += ` label="${labelText}"`;
        if (isInput && placeholder) line += ` placeholder="${placeholder}"`;
        if ((isInput || isButton) && type) line += ` type="${type}"`;
        if (isInput && valueAttr) line += ` value="${valueAttr}"`;
        if ((isInput || isButton) && formName) line += ` form="${formName}"`;

        // Append other attributes string
        if (otherAttributesStr) line += ` ${otherAttributesStr}`;

        // Append required keyword
        if (isRequired) line += ` required`;

        // Close the tag
        if (!isInput && text) {
          line += `>${text}</${node.tagName}>`;
        } else {
          line += "/>";
        }

        formattedText.push(line);
      }

      // Process children regardless
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    } else if (node.type === "TEXT_NODE") {
      // Add text only if it doesn't have a highlighted parent and is visible
      if (!hasParentWithHighlightIndex(node) && node.isVisible) {
        const trimmedText = node.text.trim();
        if (trimmedText) {
          formattedText.push(trimmedText);
        }
      }
    }
  }

  processNode(root, 0);
  return formattedText.join("\n");
}
