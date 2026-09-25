import { useRef, useState } from 'react';
import { cn } from 'cn';

export interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly TreeNode[];
}

export interface TreeViewProps {
  readonly nodes: readonly TreeNode[];
  readonly label: string;
  readonly selectedId?: string;
  readonly onSelect?: (node: TreeNode) => void;
}

export function TreeView({ nodes, label, selectedId, onSelect }: TreeViewProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string>(nodes[0]?.id ?? '');
  const treeRef = useRef<HTMLUListElement>(null);

  function toggle(id: string, open?: boolean): void {
    const next = new Set(expanded);
    if (open ?? !next.has(id)) next.add(id);
    else next.delete(id);
    setExpanded(next);
  }

  function focusIndex(index: number): void {
    const items = treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]');
    const item = items?.item(index);
    if (item === null || item === undefined) return;
    setFocusedId(item.dataset.nodeId ?? '');
    item.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLUListElement>): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'treeitem') return;
    const id = target.dataset.nodeId;
    if (id === undefined) return;
    const items = [...(treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])];
    const index = items.indexOf(target);
    const node = findNode(nodes, id);
    if (node === undefined) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusIndex(Math.min(index + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusIndex(Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        focusIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusIndex(items.length - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (node.children?.length) toggle(id, true);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (expanded.has(id)) toggle(id, false);
        else {
          const parent = findParent(nodes, id);
          if (parent !== undefined) {
            const parentIndex = items.findIndex((item) => item.dataset.nodeId === parent.id);
            focusIndex(parentIndex);
          }
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(node);
        break;
    }
  }

  function renderNodes(branch: readonly TreeNode[], depth: number): React.ReactNode {
    return branch.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0;
      const open = expanded.has(node.id);
      return (
        <li
          key={node.id}
          role="treeitem"
          aria-label={node.label}
          aria-level={depth}
          aria-selected={selectedId === node.id}
          {...(hasChildren ? { 'aria-expanded': open } : {})}
          data-node-id={node.id}
          tabIndex={focusedId === node.id ? 0 : -1}
          className={cn(
            'cursor-pointer rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            selectedId === node.id && 'bg-accent text-accent-foreground',
          )}
          onFocus={() => setFocusedId(node.id)}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(node);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (hasChildren) toggle(node.id);
          }}
        >
          <span aria-hidden="true" className="me-1 inline-block w-4">
            {hasChildren ? (open ? '▾' : '▸') : ''}
          </span>
          {node.label}
          {hasChildren && open ? (
            <ul role="group" className="ms-3 border-s ps-2">
              {renderNodes(node.children ?? [], depth + 1)}
            </ul>
          ) : null}
        </li>
      );
    });
  }

  return (
    <ul
      data-slot="tree-view"
      ref={treeRef}
      role="tree"
      aria-label={label}
      className="rounded-lg border p-2"
      onKeyDown={onKeyDown}
    >
      {renderNodes(nodes, 1)}
    </ul>
  );
}

function findNode(nodes: readonly TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children ?? [], id);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function findParent(
  nodes: readonly TreeNode[],
  id: string,
  parent?: TreeNode,
): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return parent;
    const nested = findParent(node.children ?? [], id, node);
    if (nested !== undefined) return nested;
  }
  return undefined;
}
