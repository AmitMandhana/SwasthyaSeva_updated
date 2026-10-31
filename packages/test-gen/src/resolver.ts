import type { TestFlow, TestStep, FlowNode } from './index.js';

/**
 * Resolves `after` dependencies between flows using topological sort.
 * Supports both single string and array `after` references.
 * Throws if circular dependencies or missing references are detected.
 */
export function resolveFlowOrder(flows: TestFlow[]): TestFlow[] {
  if (flows.length === 0) return [];

  const flowByName = new Map(flows.map(f => [f.name, f]));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const flow of flows) {
    inDegree.set(flow.name, 0);
    dependents.set(flow.name, []);
  }

  for (const flow of flows) {
    if (flow.after) {
      const parents = Array.isArray(flow.after) ? flow.after : [flow.after];
      for (const parent of parents) {
        if (!flowByName.has(parent)) {
          throw new Error(
            `Flow "${flow.name}" depends on "${parent}" which does not exist. ` +
            `Available flows: ${[...flowByName.keys()].join(', ')}`
          );
        }
        dependents.get(parent)!.push(flow.name);
        inDegree.set(flow.name, (inDegree.get(flow.name) || 0) + 1);
      }
    }
  }

  const queue: TestFlow[] = [];
  for (const flow of flows) {
    if (inDegree.get(flow.name) === 0) queue.push(flow);
  }

  const sorted: TestFlow[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const childName of dependents.get(node.name) || []) {
      const newDeg = inDegree.get(childName)! - 1;
      inDegree.set(childName, newDeg);
      if (newDeg === 0) {
        queue.push(flowByName.get(childName)!);
      }
    }
  }

  if (sorted.length !== flows.length) {
    const cycled = flows.filter(f => !sorted.find(s => s.name === f.name)).map(f => f.name);
    throw new Error(`Circular dependency detected in flows: ${cycled.join(', ')}`);
  }

  return sorted;
}

/**
 * Flatten a FlowNode tree into individual TestFlow entries.
 * Each root-to-leaf path becomes one TestFlow with all ancestor steps prepended.
 */
export function flattenTreeToPaths(root: FlowNode): TestFlow[] {
  const paths: TestFlow[] = [];

  function walk(node: FlowNode, ancestorSteps: TestStep[], nameChain: string[]) {
    const currentSteps = [...ancestorSteps, ...node.steps];
    const currentName = [...nameChain, node.name];

    if (!node.children || node.children.length === 0) {
      paths.push({
        name: currentName.join(' > '),
        steps: currentSteps,
      });
    } else {
      for (const child of node.children) {
        walk(child, currentSteps, currentName);
      }
    }
  }

  walk(root, [], []);
  return paths;
}
