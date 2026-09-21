/**
 * Rich Text Formatting Utilities for ContentEditable
 * Provides rock-solid boundary splitting, formatting application, and complete unwrap/clearing.
 */

export function isFormattingElement(node: Node): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();
  if (tag === "MARK" || tag === "FONT") return true;
  if (tag === "SPAN") {
    if (
      el.className &&
      (el.className.includes("color-") || el.className.includes("marker-"))
    ) {
      return true;
    }
    if (el.style && (el.style.color || el.style.backgroundColor || el.style.background)) {
      return true;
    }
  }
  return false;
}

export function isMarkerElement(node: Node): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();
  if (tag === "MARK") return true;
  if (el.className && el.className.includes("marker-")) return true;
  if (el.style && (el.style.backgroundColor || el.style.background)) return true;
  return false;
}

export function isColorElement(node: Node): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();
  if (tag === "FONT") return true;
  if (el.className && el.className.includes("color-")) return true;
  if (el.style && el.style.color) return true;
  return false;
}

export function unwrapElement(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

export function unwrapAllFormatting(el: HTMLElement, formatFilter?: "marker" | "color") {
  const filterFn = (node: Node) => {
    if (formatFilter === "marker") return isMarkerElement(node);
    if (formatFilter === "color") return isColorElement(node);
    return isFormattingElement(node);
  };

  const descendants = Array.from(el.querySelectorAll("*")).filter(filterFn);
  for (let i = descendants.length - 1; i >= 0; i--) {
    unwrapElement(descendants[i] as HTMLElement);
  }

  if (filterFn(el)) {
    unwrapElement(el);
  }
}

/**
 * Splits `parent` around `target` so that `target` is the only child of `parent`.
 * Preceding siblings go to a cloned parent on the left.
 * Subsequent siblings go to a cloned parent on the right.
 */
export function isolateNodeInParent(target: Node, parent: HTMLElement): HTMLElement {
  const grandParent = parent.parentNode;
  if (!grandParent) return parent;

  // Move preceding siblings into parentLeft
  const prevSiblings: Node[] = [];
  let prev = target.previousSibling;
  while (prev) {
    prevSiblings.unshift(prev);
    prev = prev.previousSibling;
  }

  if (prevSiblings.length > 0) {
    const parentLeft = parent.cloneNode(false) as HTMLElement;
    grandParent.insertBefore(parentLeft, parent);
    for (const sib of prevSiblings) {
      parentLeft.appendChild(sib);
    }
  }

  // Move following siblings into parentRight
  const nextSiblings: Node[] = [];
  let next = target.nextSibling;
  while (next) {
    nextSiblings.push(next);
    next = next.nextSibling;
  }

  if (nextSiblings.length > 0) {
    const parentRight = parent.cloneNode(false) as HTMLElement;
    grandParent.insertBefore(parentRight, parent.nextSibling);
    for (const sib of nextSiblings) {
      parentRight.appendChild(sib);
    }
  }

  return parent;
}

/**
 * Isolates `target` all the way up through any formatting ancestors until `root`.
 */
export function isolateNodeUpToRoot(target: Node, root: HTMLElement): HTMLElement | null {
  let curr: Node = target;
  let highestIsolated: HTMLElement | null = null;

  while (curr && curr.parentNode && curr.parentNode !== root) {
    const parent = curr.parentNode as HTMLElement;
    if (isFormattingElement(parent)) {
      isolateNodeInParent(curr, parent);
      highestIsolated = parent;
      curr = parent;
    } else {
      curr = parent;
    }
  }

  return highestIsolated;
}

/**
 * Applies a format (marker, color, or clear) to a DOM Range inside `root`.
 * Returns a new Range selecting the modified text, or null.
 */
export function applyFormatToRange(
  range: Range,
  root: HTMLElement,
  formatType: "marker" | "color" | "clear",
  colorId?: string
): Range | null {
  // Case 1: Collapsed cursor inside a formatting element
  if (range.collapsed) {
    let current: Node | null = range.startContainer;
    let formatAncestor: HTMLElement | null = null;
    while (current && current !== root) {
      if (isFormattingElement(current)) {
        formatAncestor = current as HTMLElement;
        break;
      }
      current = current.parentNode;
    }

    if (formatAncestor) {
      if (formatType === "clear") {
        unwrapAllFormatting(formatAncestor);
      } else if (formatType === "marker") {
        unwrapAllFormatting(formatAncestor, "marker");
        const mark = document.createElement("mark");
        mark.className = `marker-${colorId}`;
        const parent = formatAncestor.parentNode || root;
        parent.insertBefore(mark, formatAncestor);
        mark.appendChild(formatAncestor);
      } else if (formatType === "color") {
        unwrapAllFormatting(formatAncestor, "color");
        const span = document.createElement("span");
        span.className = `color-${colorId}`;
        const parent = formatAncestor.parentNode || root;
        parent.insertBefore(span, formatAncestor);
        span.appendChild(formatAncestor);
      }
      root.normalize();
      return range;
    }
    return null;
  }

  // Case 2: Range with selection
  const selectedTextNodes: Text[] = [];

  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    let node = range.startContainer as Text;
    if (range.endOffset < node.length) {
      node.splitText(range.endOffset);
    }
    if (range.startOffset > 0) {
      node = node.splitText(range.startOffset);
    }
    if (node.length > 0) {
      selectedTextNodes.push(node);
    }
  } else {
    // Range spans across different containers:
    // Split endContainer first if it is a text node
    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      const endText = range.endContainer as Text;
      if (range.endOffset > 0 && range.endOffset < endText.length) {
        endText.splitText(range.endOffset);
        range.setEnd(endText, endText.length);
      }
    }

    // Split startContainer if it is a text node
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const startText = range.startContainer as Text;
      if (range.startOffset > 0 && range.startOffset < startText.length) {
        const secondPart = startText.splitText(range.startOffset);
        range.setStart(secondPart, 0);
      }
    }

    // Helper: test if node intersects the range
    const nodeIntersects = (node: Node): boolean => {
      if (typeof range.intersectsNode === "function") {
        try {
          return range.intersectsNode(node);
        } catch {}
      }
      try {
        const len = node.nodeType === Node.TEXT_NODE ? (node as Text).length : node.childNodes.length;
        const startCmp = range.comparePoint(node, len);
        const endCmp = range.comparePoint(node, 0);
        return startCmp >= 0 && endCmp <= 0;
      } catch {
        return false;
      }
    };

    // Collect all text nodes that intersect the range
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let curr: Text | null = walker.nextNode() as Text | null;

    while (curr) {
      if (nodeIntersects(curr) && curr.length > 0) {
        selectedTextNodes.push(curr);
      }
      curr = walker.nextNode() as Text | null;
    }
  }

  if (selectedTextNodes.length === 0) return null;

  // For each selected text node, isolate it from surrounding text in formatting ancestors
  for (const node of selectedTextNodes) {
    const highest = isolateNodeUpToRoot(node, root);

    if (formatType === "clear") {
      // Find all formatting ancestors of this text node up to root
      let parent = node.parentNode;
      while (parent && parent !== root) {
        const nextParent = parent.parentNode;
        if (isFormattingElement(parent)) {
          unwrapElement(parent as HTMLElement);
        }
        parent = nextParent;
      }
    } else if (formatType === "marker") {
      // Unwrap any existing marker ancestor first to prevent duplicate/nested markers
      let parent = node.parentNode;
      while (parent && parent !== root) {
        const nextParent = parent.parentNode;
        if (isMarkerElement(parent)) {
          unwrapElement(parent as HTMLElement);
        }
        parent = nextParent;
      }
      // Wrap node in new marker
      const mark = document.createElement("mark");
      mark.className = `marker-${colorId}`;
      node.parentNode?.insertBefore(mark, node);
      mark.appendChild(node);
    } else if (formatType === "color") {
      // Unwrap any existing color ancestor first
      let parent = node.parentNode;
      while (parent && parent !== root) {
        const nextParent = parent.parentNode;
        if (isColorElement(parent)) {
          unwrapElement(parent as HTMLElement);
        }
        parent = nextParent;
      }
      // Wrap node in new color span
      const span = document.createElement("span");
      span.className = `color-${colorId}`;
      node.parentNode?.insertBefore(span, node);
      span.appendChild(node);
    }
  }

  // Remove any leftover empty formatting elements
  const allFormatting = Array.from(root.querySelectorAll("mark, span, font")).filter(isFormattingElement);
  for (const el of allFormatting) {
    if (!el.textContent && !el.hasChildNodes()) {
      el.parentNode?.removeChild(el);
    }
  }

  // Create a new Range spanning from the first selected node to the last
  const newRange = document.createRange();
  const firstNode = selectedTextNodes[0];
  const lastNode = selectedTextNodes[selectedTextNodes.length - 1];

  if (firstNode && lastNode) {
    newRange.setStart(firstNode, 0);
    newRange.setEnd(lastNode, lastNode.length);
  }

  return newRange;
}
