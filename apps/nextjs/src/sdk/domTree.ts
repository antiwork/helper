/**
 * DOM node types
 */
export interface DOMTextNode {
  type: "TEXT_NODE";
  text: string;
  isVisible: boolean;
  parent?: DOMElementNode;
}

export interface DOMElementNode {
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

export type DOMNode = DOMElementNode | DOMTextNode;

export type SelectorMap = Record<number, DOMElementNode>;

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
export function flattenDomTree(root: DOMElementNode): DOMNode[] {
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
 * Finds a node in the DOM tree by xpath
 * @param root The root node
 * @param xpath The xpath to find
 * @returns The found node or null
 */
export function findNodeByXpath(root: DOMElementNode, xpath: string): DOMElementNode | null {
  if (root.xpath === xpath) return root;

  for (const child of root.children) {
    if ("xpath" in child) {
      const elementChild = child;
      if (elementChild.xpath === xpath) return elementChild;

      const found = findNodeByXpath(elementChild, xpath);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Converts a DOM tree to a formatted string representation for display/debugging
 * @param root The root node of the DOM tree
 * @param includeAttributes Optional list of attribute names to include in the output
 * @returns Formatted string representation of the clickable elements in the DOM tree
 */
export function stringifyDomTree(root: DOMElementNode, includeAttributes?: string[]): string {
  const formattedText: string[] = [];

  function processNode(node: DOMNode, depth: number): void {
    if ("tagName" in node) {
      // Add element with highlight_index
      if (node.highlightIndex !== undefined) {
        let attributesStr = "";
        const text = getTextTillNextClickableElement(node);

        if (includeAttributes && includeAttributes.length > 0) {
          const attributes = Array.from(
            new Set(
              Object.entries(node.attributes)
                .filter(([key, value]) => includeAttributes.includes(key) && value !== node.tagName)
                .map(([_, value]) => String(value)),
            ),
          );

          if (text && attributes.includes(text)) {
            attributes.splice(attributes.indexOf(text), 1);
          }

          attributesStr = attributes.join(";");
        }

        let line = `[${node.highlightIndex}]<${node.tagName} `;

        if (attributesStr) {
          line += attributesStr;
        }

        if (text) {
          if (attributesStr) {
            line += `>${text}`;
          } else {
            line += text;
          }
        }

        line += "/>";
        formattedText.push(line);
      }

      // Process children regardless
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    } else if (node.type === "TEXT_NODE") {
      // Add text only if it doesn't have a highlighted parent and is visible
      if (!hasParentWithHighlightIndex(node) && node.isVisible) {
        formattedText.push(node.text);
      }
    }
  }

  processNode(root, 0);
  return formattedText.join("\n");
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
 * Finds all interactive elements in the DOM tree
 * @param root The root node
 * @returns Array of interactive elements with their highlight indices and descriptions
 */
export function findInteractiveElements(root: DOMElementNode): {
  index: number;
  element: DOMElementNode;
  description: string;
}[] {
  const interactiveElements: { index: number; element: DOMElementNode; description: string }[] = [];

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
      // Add element with highlight_index
      if (node.highlightIndex !== undefined) {
        let attributesStr = "";
        const text = getTextTillNextClickableElement(node);

        if (includeAttributes && includeAttributes.length > 0) {
          const attributes = Array.from(
            new Set(
              Object.entries(node.attributes)
                .filter(([key, value]) => includeAttributes.includes(key) && value !== node.tagName)
                .map(([_, value]) => String(value)),
            ),
          );

          if (text && attributes.includes(text)) {
            attributes.splice(attributes.indexOf(text), 1);
          }

          attributesStr = attributes.join(";");
        }

        let line = `[${node.highlightIndex}]<${node.tagName} `;

        if (attributesStr) {
          line += attributesStr;
        }

        if (text) {
          if (attributesStr) {
            line += `>${text}`;
          } else {
            line += text;
          }
        }

        line += "/>";
        formattedText.push(line);
      }

      // Process children regardless
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    } else if (node.type === "TEXT_NODE") {
      // Add text only if it doesn't have a highlighted parent and is visible
      if (!hasParentWithHighlightIndex(node) && node.isVisible) {
        formattedText.push(node.text);
      }
    }
  }

  processNode(root, 0);
  return formattedText.join("\n");
}
