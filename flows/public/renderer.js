const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  ReactFlow, Background, Controls, MiniMap,
  Handle, Position, useNodesState, useEdgesState,
  MarkerType
} = window.xyflowReact || window.ReactFlow || {};

// ── View Modes ──
const VIEW_MODES = {
  all:     { label: "ALL",          apps: ["web", "clinic", "admin", "doctor", "cross-app"] },
  patient: { label: "Patient",      apps: ["web"] },
  doctor:  { label: "Doctor",       apps: ["doctor"] },
  clinic:  { label: "Clinic Admin", apps: ["clinic"] },
  admin:   { label: "Admin",        apps: ["admin"] },
};

// ── Edge color/style mapping ──
const EDGE_STYLES = {
  user_action:        { stroke: "#58a6ff", strokeDasharray: null },
  api_request:        { stroke: "#f0883e", strokeDasharray: null },
  api_response:       { stroke: "#3fb950", strokeDasharray: "6 3" },
  db_query:           { stroke: "#bc8cff", strokeDasharray: null },
  db_result:          { stroke: "#bc8cff", strokeDasharray: "6 3" },
  external_call:      { stroke: "#f85149", strokeDasharray: null },
  external_response:  { stroke: "#f85149", strokeDasharray: "6 3" },
  internal:           { stroke: "#484f58", strokeDasharray: "3 3" },
  navigation:         { stroke: "#39d0ba", strokeDasharray: null },
  error:              { stroke: "#f85149", strokeDasharray: null },
};

// ── Actor column positions ──
const ACTOR_COLS = { user: 0, frontend: 1, backend: 2, database: 3, external: 4 };
const ACTOR_LABELS = { user: "User", frontend: "Frontend", backend: "Backend", database: "Database", external: "External" };
const COL_WIDTH = 280;
const COMPONENT_GAP = 200;

// ═══════════════════════════════════════════
// Layout Pipeline
// ═══════════════════════════════════════════

function namespaceFlow(flow) {
  var prefix = flow.id + ":";
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    nodes: flow.nodes.map(function(n) {
      return Object.assign({}, n, { id: prefix + n.id, _flowId: flow.id, _origId: n.id });
    }),
    edges: flow.edges.map(function(e) {
      return Object.assign({}, e, { from: prefix + e.from, to: prefix + e.to, _flowId: flow.id });
    }),
  };
}

function mergeSharedNodes(flows) {
  var allNodes = [];
  var allEdges = [];
  var sharedGroups = {};
  var nodeToShared = {};

  flows.forEach(function(flow) {
    flow.nodes.forEach(function(node) {
      if (node.sharedId) {
        if (!sharedGroups[node.sharedId]) sharedGroups[node.sharedId] = [];
        sharedGroups[node.sharedId].push(node);
        nodeToShared[node.id] = node.sharedId;
      }
      allNodes.push(node);
    });
    flow.edges.forEach(function(e) { allEdges.push(e); });
  });

  var mergedNodes = [];
  var seen = {};

  allNodes.forEach(function(node) {
    var canonicalId = node.sharedId || node.id;
    if (seen[canonicalId]) return;
    seen[canonicalId] = true;

    if (node.sharedId) {
      var group = sharedGroups[node.sharedId];
      var flowIds = [];
      var seenFlows = {};
      group.forEach(function(n) {
        if (!seenFlows[n._flowId]) { flowIds.push(n._flowId); seenFlows[n._flowId] = true; }
      });
      // Pick the label: prefer 'end' type nodes (they describe the screen),
      // then 'page'/'action', then fall back to first
      var bestNode = group[0];
      var priority = { end: 3, page: 2, action: 1 };
      group.forEach(function(n) {
        if ((priority[n.type] || 0) > (priority[bestNode.type] || 0)) bestNode = n;
      });
      var bestLabel = bestNode.label;
      mergedNodes.push(Object.assign({}, node, {
        id: node.sharedId,
        label: bestLabel,
        _isHub: true,
        _hubFlows: flowIds,
        _hubCount: group.length,
        _flowId: flowIds[0], // Primary flow
      }));
    } else {
      mergedNodes.push(node);
    }
  });

  var resolveId = function(id) { return nodeToShared[id] || id; };
  var mergedEdges = [];
  var edgeSet = {};

  allEdges.forEach(function(edge) {
    var from = resolveId(edge.from);
    var to = resolveId(edge.to);
    if (from === to) return;
    var key = from + "|" + to + "|" + (edge.type || "") + "|" + (edge.label || "");
    if (edgeSet[key]) return;
    edgeSet[key] = true;
    mergedEdges.push(Object.assign({}, edge, { from: from, to: to }));
  });

  return { nodes: mergedNodes, edges: mergedEdges };
}

function findConnectedComponents(nodeIds, edges) {
  var adj = {};
  nodeIds.forEach(function(id) { adj[id] = []; });
  edges.forEach(function(e) {
    if (adj[e.from] && adj[e.to]) {
      adj[e.from].push(e.to);
      adj[e.to].push(e.from);
    }
  });

  var visited = {};
  var components = [];

  nodeIds.forEach(function(id) {
    if (visited[id]) return;
    var component = [];
    var stack = [id];
    while (stack.length) {
      var curr = stack.pop();
      if (visited[curr]) continue;
      visited[curr] = true;
      component.push(curr);
      (adj[curr] || []).forEach(function(neighbor) {
        if (!visited[neighbor]) stack.push(neighbor);
      });
    }
    components.push(component);
  });

  return components;
}

function layoutComponent(compNodes, compEdges) {
  var g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(function() { return {}; });
  g.setGraph({ rankdir: "TB", ranksep: 90, nodesep: 40, marginx: 40, marginy: 40 });

  compNodes.forEach(function(node) {
    var w = node.type === "decision" ? 120 : (node._isHub ? 200 : 170);
    var h = node.type === "decision" ? 70 : (node._isHub ? 56 : 48);
    g.setNode(node.id, { width: w, height: h });
  });

  compEdges.forEach(function(edge) {
    g.setEdge(edge.from, edge.to);
  });

  dagre.layout(g);

  // Let dagre fully control both X and Y — no actor column forcing
  var positions = [];
  var maxX = 0, maxY = 0;
  compNodes.forEach(function(node) {
    var pos = g.node(node.id);
    var x = pos ? pos.x - pos.width / 2 : 0;
    var y = pos ? pos.y - pos.height / 2 : 0;
    if (x + (pos ? pos.width : 170) > maxX) maxX = x + (pos ? pos.width : 170);
    if (y + (pos ? pos.height : 48) > maxY) maxY = y + (pos ? pos.height : 48);
    positions.push({ node: node, x: x, y: y });
  });

  return { positions: positions, width: maxX + 40, height: maxY + 40 };
}

function layoutGraph(allNodes, allEdges, devMode) {
  var visibleNodes = devMode ? allNodes : allNodes.filter(function(n) { return !n.devOnly; });
  var visibleNodeIds = {};
  visibleNodes.forEach(function(n) { visibleNodeIds[n.id] = true; });
  var visibleEdges = (devMode ? allEdges : allEdges.filter(function(e) { return !e.devOnly; }))
    .filter(function(e) { return visibleNodeIds[e.from] && visibleNodeIds[e.to]; });

  var nodeIdList = visibleNodes.map(function(n) { return n.id; });
  var components = findConnectedComponents(nodeIdList, visibleEdges);
  // Sort by size descending so the biggest graph comes first
  components.sort(function(a, b) { return b.length - a.length; });

  var nodeMap = {};
  visibleNodes.forEach(function(n) { nodeMap[n.id] = n; });

  // Layout each component independently
  var compLayouts = components.map(function(componentIds) {
    var compIdSet = {};
    componentIds.forEach(function(id) { compIdSet[id] = true; });
    var compNodes = visibleNodes.filter(function(n) { return compIdSet[n.id]; });
    var compEdges = visibleEdges.filter(function(e) { return compIdSet[e.from] && compIdSet[e.to]; });
    return layoutComponent(compNodes, compEdges);
  });

  // Arrange components in a grid: place side-by-side, wrap to new row when too wide
  var CLUSTER_GAP_X = 150;
  var CLUSTER_GAP_Y = 200;
  var MAX_ROW_WIDTH = 6000;

  var allRfNodes = [];
  var cursorX = 0;
  var cursorY = 0;
  var rowMaxHeight = 0;

  compLayouts.forEach(function(layout) {
    // Wrap to next row if this component would exceed max width
    if (cursorX > 0 && cursorX + layout.width > MAX_ROW_WIDTH) {
      cursorX = 0;
      cursorY += rowMaxHeight + CLUSTER_GAP_Y;
      rowMaxHeight = 0;
    }

    layout.positions.forEach(function(p) {
      allRfNodes.push({
        id: p.node.id,
        type: "flowNode",
        position: { x: p.x + cursorX, y: p.y + cursorY },
        data: Object.assign({}, p.node, { onClick: null }),
      });
    });

    if (layout.height > rowMaxHeight) rowMaxHeight = layout.height;
    cursorX += layout.width + CLUSTER_GAP_X;
  });

  var rfEdges = visibleEdges.map(function(edge, i) {
    var style = EDGE_STYLES[edge.type] || EDGE_STYLES.internal;
    return {
      id: "e-" + edge.from + "-" + edge.to + "-" + i,
      source: edge.from,
      target: edge.to,
      label: edge.label || "",
      labelStyle: { fill: "#8b949e", fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: "#0d1117", fillOpacity: 1 },
      labelBgPadding: [6, 10],
      labelBgBorderRadius: 4,
      style: { stroke: style.stroke, strokeWidth: 2, strokeDasharray: style.strokeDasharray },
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 16, height: 16 },
      type: "default",
      animated: edge.type === "error",
      data: edge,
    };
  });

  return { rfNodes: allRfNodes, rfEdges: rfEdges };
}

function assembleCanvas(apps, viewMode, devMode) {
  var modeConfig = VIEW_MODES[viewMode];
  var filteredApps = apps.filter(function(a) { return modeConfig.apps.indexOf(a.app) !== -1; });

  var allFlows = [];
  filteredApps.forEach(function(app) {
    var appActorLabels = app.actorLabels || {};
    app.flows.forEach(function(flow) {
      var nsFlow = namespaceFlow(flow);
      // Attach per-app actor labels to each node
      nsFlow.nodes.forEach(function(n) { n._actorLabels = appActorLabels; });
      allFlows.push(nsFlow);
    });
  });

  var merged = mergeSharedNodes(allFlows);
  return layoutGraph(merged.nodes, merged.edges, devMode);
}

// ═══════════════════════════════════════════
// Helper: get bounding box for a flow's nodes
// ═══════════════════════════════════════════

function getFlowBounds(nodes, flowId) {
  var flowNodes = nodes.filter(function(n) {
    return n.data._flowId === flowId ||
      (n.data._isHub && n.data._hubFlows && n.data._hubFlows.indexOf(flowId) !== -1);
  });
  if (flowNodes.length === 0) return null;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  flowNodes.forEach(function(n) {
    if (n.position.x < minX) minX = n.position.x;
    if (n.position.y < minY) minY = n.position.y;
    if (n.position.x + 200 > maxX) maxX = n.position.x + 200;
    if (n.position.y + 60 > maxY) maxY = n.position.y + 60;
  });
  return { x: minX - 80, y: minY - 80, width: maxX - minX + 160, height: maxY - minY + 160 };
}

// ═══════════════════════════════════════════
// Custom Node Component
// ═══════════════════════════════════════════

function FlowNode({ data }) {
  var type = data.type;
  var label = data.label;
  var actor = data.actor || "frontend";
  var onClick = data.onClick;
  var isHub = data._isHub;
  var isDimmed = data._dimmed;
  var isDiamond = type === "decision";
  var appLabels = data._actorLabels || {};

  var wrapClass = "flow-node-wrap";
  if (isHub) wrapClass += " shared-hub";
  if (isDimmed) wrapClass += " dimmed";

  var actorLabel = appLabels[actor] || ACTOR_LABELS[actor] || actor;

  if (isDiamond) {
    // Diamond: actor tag above, diamond body below
    return React.createElement("div", {
      className: wrapClass + " decision-wrap",
      onClick: function() { if (onClick) onClick(data); },
    },
      React.createElement(Handle, { type: "target", position: Position.Top, style: { opacity: 0 } }),
      React.createElement("div", { className: "node-actor-tag actor-" + actor }, actorLabel),
      React.createElement("div", { className: "node-diamond" },
        React.createElement("span", { className: "node-label" }, label)
      ),
      React.createElement(Handle, { type: "source", position: Position.Bottom, style: { opacity: 0 } })
    );
  }

  // Normal node: actor header + typed body
  return React.createElement("div", {
    className: wrapClass,
    onClick: function() { if (onClick) onClick(data); },
  },
    React.createElement(Handle, { type: "target", position: Position.Top, style: { opacity: 0 } }),
    React.createElement("div", { className: "node-actor-header actor-" + actor }, actorLabel),
    React.createElement("div", { className: "node-body body-" + type },
      label,
      isHub ? React.createElement("span", { className: "hub-badge" }, data._hubCount + " flows") : null
    ),
    React.createElement(Handle, { type: "source", position: Position.Bottom, style: { opacity: 0 } })
  );
}

var nodeTypes = { flowNode: FlowNode };

// ═══════════════════════════════════════════
// Detail Panel
// ═══════════════════════════════════════════

function DetailPanel({ item, onClose }) {
  if (!item) return null;
  var isNode = !!item.actor;
  var detail = item.detail || {};

  return React.createElement("div", { className: "detail-panel open" },
    React.createElement("div", { className: "detail-header" },
      React.createElement("h3", null, isNode ? "Node Detail" : "Edge Detail"),
      React.createElement("button", { className: "detail-close", onClick: onClose }, "\u00D7")
    ),
    React.createElement("div", { className: "detail-body" },
      React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Type"),
        React.createElement("span", { className: "badge " + item.type }, item.type.replace(/_/g, " "))
      ),
      React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Label"),
        React.createElement("div", { className: "value" }, item.label || "(no label)")
      ),
      isNode && item.actor && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Actor"),
        React.createElement("div", { className: "value" }, ACTOR_LABELS[item.actor] || item.actor)
      ),
      item._isHub && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Hub — Connected Flows"),
        React.createElement("div", { className: "value" }, (item._hubFlows || []).join(", "))
      ),
      detail.description && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Description"),
        React.createElement("div", { className: "value" }, detail.description)
      ),
      detail.file && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "File"),
        React.createElement("div", { className: "value mono" }, detail.file)
      ),
      detail.handler && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Handler"),
        React.createElement("div", { className: "value mono" }, detail.handler)
      ),
      detail.dataShape && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Data Shape"),
        React.createElement("div", { className: "value mono" },
          typeof detail.dataShape === "string" ? detail.dataShape : JSON.stringify(detail.dataShape, null, 2)
        )
      ),
      detail.code && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Code"),
        React.createElement("div", { className: "value mono" }, detail.code)
      ),
      detail.errorCases && detail.errorCases.length > 0 && React.createElement("div", { className: "detail-section" },
        React.createElement("div", { className: "label" }, "Error Cases"),
        React.createElement("ul", { className: "error-list" },
          detail.errorCases.map(function(e, i) { return React.createElement("li", { key: i }, e); })
        )
      )
    )
  );
}

// ═══════════════════════════════════════════
// Sidebar
// ═══════════════════════════════════════════

function Sidebar({ apps, viewMode, highlightedFlowId, onSelectFlow, searchQuery, onSearchChange }) {
  var modeConfig = VIEW_MODES[viewMode];
  var filteredApps = apps.filter(function(a) { return modeConfig.apps.indexOf(a.app) !== -1; });

  var displayApps = useMemo(function() {
    if (!searchQuery.trim()) return filteredApps;
    var q = searchQuery.toLowerCase();
    return filteredApps.map(function(app) {
      return Object.assign({}, app, {
        flows: app.flows.filter(function(f) {
          return f.name.toLowerCase().indexOf(q) !== -1 || f.id.toLowerCase().indexOf(q) !== -1;
        })
      });
    }).filter(function(app) { return app.flows.length > 0; });
  }, [filteredApps, searchQuery]);

  var totalFlows = 0;
  displayApps.forEach(function(a) { totalFlows += a.flows.length; });

  return React.createElement("div", { className: "sidebar" },
    React.createElement("div", { className: "sidebar-header" },
      React.createElement("div", { className: "logo" }, "S"),
      React.createElement("h1", null, "Flow Viewer")
    ),
    React.createElement("div", { className: "sidebar-search" },
      React.createElement("input", {
        type: "text",
        placeholder: "Search flows...",
        value: searchQuery,
        onChange: function(e) { onSearchChange(e.target.value); },
      })
    ),
    React.createElement("div", { className: "sidebar-flows" },
      displayApps.map(function(app) {
        return React.createElement("div", { key: app.app, className: "app-section" },
          viewMode === "all" && React.createElement("div", { className: "app-header" },
            React.createElement("span", null, app.name),
            React.createElement("span", { className: "count" }, app.flows.length)
          ),
          app.flows.map(function(flow) {
            return React.createElement("div", {
              key: flow.id,
              className: "flow-item" + (highlightedFlowId === flow.id ? " active" : ""),
              onClick: function() { onSelectFlow(flow.id); },
            }, flow.name);
          })
        );
      }),
      totalFlows === 0 && React.createElement("div", { className: "sidebar-empty" }, "No flows match")
    )
  );
}

// ═══════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════

function App() {
  var rfInstanceRef = useRef(null);
  var highlightTimerRef = useRef(null);

  var _ns = useNodesState([]);
  var nodes = _ns[0], setNodes = _ns[1], onNodesChange = _ns[2];
  var _es = useEdgesState([]);
  var edges = _es[0], setEdges = _es[1], onEdgesChange = _es[2];

  var [apps, setApps] = useState([]);
  var [viewMode, setViewMode] = useState("patient");
  var [devMode, setDevMode] = useState(false);
  var [searchQuery, setSearchQuery] = useState("");
  var [detailItem, setDetailItem] = useState(null);
  var [highlightedFlowId, setHighlightedFlowId] = useState(null);

  // Load flow data
  useEffect(function() {
    fetch("/api/flows")
      .then(function(r) { return r.json(); })
      .then(function(data) { setApps(data.apps || []); })
      .catch(function(err) { console.error("Failed to load flows:", err); });
  }, []);

  // Layout when apps, viewMode, or devMode changes
  useEffect(function() {
    if (!apps.length) return;
    var result = assembleCanvas(apps, viewMode, devMode);

    // Attach click handlers
    var nodesWithClick = result.rfNodes.map(function(n) {
      return Object.assign({}, n, {
        data: Object.assign({}, n.data, {
          onClick: function(data) { setDetailItem(data); },
        }),
      });
    });

    setNodes(nodesWithClick);
    setEdges(result.rfEdges);
    setHighlightedFlowId(null);
    setDetailItem(null);

    // Fit view after layout
    setTimeout(function() {
      if (rfInstanceRef.current) rfInstanceRef.current.fitView({ padding: 0.1, duration: 500 });
    }, 100);
  }, [apps, viewMode, devMode]);

  // Handle highlight changes
  useEffect(function() {
    if (!nodes.length) return;

    setNodes(function(prev) {
      return prev.map(function(n) {
        var isPartOfFlow = highlightedFlowId && (
          n.data._flowId === highlightedFlowId ||
          (n.data._isHub && n.data._hubFlows && n.data._hubFlows.indexOf(highlightedFlowId) !== -1)
        );
        var dimmed = highlightedFlowId ? !isPartOfFlow : false;
        return Object.assign({}, n, {
          data: Object.assign({}, n.data, {
            _dimmed: dimmed,
            onClick: function(data) { setDetailItem(data); },
          }),
        });
      });
    });

    setEdges(function(prev) {
      return prev.map(function(e) {
        var edgeFlowId = e.data ? e.data._flowId : null;
        var dimmed = highlightedFlowId ? edgeFlowId !== highlightedFlowId : false;
        var baseStyle = EDGE_STYLES[e.data ? e.data.type : "internal"] || EDGE_STYLES.internal;
        return Object.assign({}, e, {
          style: Object.assign({}, e.style, { opacity: dimmed ? 0.15 : 1 }),
          labelStyle: Object.assign({}, e.labelStyle, { opacity: dimmed ? 0.15 : 1 }),
        });
      });
    });
  }, [highlightedFlowId]);

  // Select flow from sidebar
  var handleSelectFlow = useCallback(function(flowId) {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    setHighlightedFlowId(flowId);

    // Pan to flow
    if (rfInstanceRef.current) {
      var bounds = getFlowBounds(nodes, flowId);
      if (bounds) {
        rfInstanceRef.current.fitBounds(bounds, { duration: 800, padding: 0.15 });
      }
    }

    // Highlight stays until user clicks another flow or clicks the canvas
  }, [nodes]);

  var handlePaneClick = useCallback(function() {
    setHighlightedFlowId(null);
    setDetailItem(null);
  }, []);

  var onEdgeClick = useCallback(function(event, edge) {
    if (edge.data) setDetailItem(edge.data);
  }, []);

  var handleViewModeChange = useCallback(function(mode) {
    setViewMode(mode);
    setSearchQuery("");
  }, []);

  // 100% zoom button
  var handleZoom100 = useCallback(function() {
    if (!rfInstanceRef.current) return;
    var vp = rfInstanceRef.current.getViewport();
    rfInstanceRef.current.setViewport({ x: vp.x, y: vp.y, zoom: 1 }, { duration: 300 });
  }, []);

  // Custom wheel handler for faster zoom (3x sensitivity)
  var handleWheel = useCallback(function(event) {
    if (!rfInstanceRef.current) return;
    // Only zoom on ctrl+wheel (pinch) or plain wheel
    var vp = rfInstanceRef.current.getViewport();
    var zoomSpeed = 1.08; // ~8% per tick, stacks fast
    var factor = event.deltaY > 0 ? (1 / zoomSpeed) : zoomSpeed;
    // For pinch gestures (ctrlKey is set), use bigger steps
    if (event.ctrlKey) {
      factor = event.deltaY > 0 ? (1 / 1.04) : 1.04;
    }
    var newZoom = Math.min(Math.max(vp.zoom * factor, 0.02), 4);
    // Zoom toward cursor position
    var bounds = event.currentTarget.getBoundingClientRect();
    var mouseX = event.clientX - bounds.left;
    var mouseY = event.clientY - bounds.top;
    var scale = newZoom / vp.zoom;
    var newX = mouseX - (mouseX - vp.x) * scale;
    var newY = mouseY - (mouseY - vp.y) * scale;
    rfInstanceRef.current.setViewport({ x: newX, y: newY, zoom: newZoom });
  }, []);

  return React.createElement(React.Fragment, null,
    React.createElement(Sidebar, {
      apps: apps,
      viewMode: viewMode,
      highlightedFlowId: highlightedFlowId,
      onSelectFlow: handleSelectFlow,
      searchQuery: searchQuery,
      onSearchChange: setSearchQuery,
    }),
    React.createElement("div", { className: "main" },
      // Toolbar with view mode tabs + dev toggle
      React.createElement("div", { className: "toolbar" },
        React.createElement("div", { className: "view-mode-bar" },
          Object.keys(VIEW_MODES).map(function(key) {
            return React.createElement("button", {
              key: key,
              className: "view-mode-tab" + (viewMode === key ? " active" : ""),
              onClick: function() { handleViewModeChange(key); },
            }, VIEW_MODES[key].label);
          })
        ),
        React.createElement("div", { className: "controls" },
          React.createElement("label", { className: "dev-toggle" },
            React.createElement("input", {
              type: "checkbox",
              checked: devMode,
              onChange: function() { setDevMode(function(d) { return !d; }); },
            }),
            "Dev Mode"
          )
        )
      ),
      // Canvas
      React.createElement("div", { className: "canvas-area", ref: function(el) {
        if (el && !el._wheelBound) {
          el._wheelBound = true;
          el.addEventListener("wheel", function(e) { e.preventDefault(); handleWheel(e); }, { passive: false });
        }
      } },
        nodes.length > 0
          ? React.createElement(ReactFlow, {
              nodes: nodes,
              edges: edges,
              onNodesChange: onNodesChange,
              onEdgesChange: onEdgesChange,
              onEdgeClick: onEdgeClick,
              onPaneClick: handlePaneClick,
              onInit: function(instance) { rfInstanceRef.current = instance; },
              nodeTypes: nodeTypes,
              fitView: true,
              fitViewOptions: { padding: 0.1 },
              minZoom: 0.02,
              maxZoom: 4,
              zoomOnScroll: false,
              zoomOnPinch: false,
              proOptions: { hideAttribution: true },
            },
              React.createElement(Background, { color: "#21262d", gap: 20, size: 1 }),
              React.createElement(Controls, { showInteractive: false },
                React.createElement("button", {
                  className: "react-flow__controls-button",
                  onClick: handleZoom100,
                  title: "Zoom to 100%",
                  style: { fontSize: "10px", fontWeight: 700 },
                }, "1:1")
              ),
              React.createElement(MiniMap, {
                nodeColor: function(n) {
                  var t = n.data ? n.data.type : null;
                  if (n.data && n.data._isHub) return "#f0f6fc";
                  if (t === "error") return "#f85149";
                  if (t === "decision") return "#484f58";
                  if (t === "start") return "#58a6ff";
                  if (t === "end") return "#484f58";
                  if (t && t.indexOf("db") === 0) return "#bc8cff";
                  if (t && t.indexOf("external") === 0) return "#f85149";
                  if (t === "api_response") return "#3fb950";
                  return "#f0883e";
                },
                maskColor: "rgba(13, 17, 23, 0.8)",
                style: { width: 200, height: 150 },
              })
            )
          : React.createElement("div", { className: "empty-state" },
              React.createElement("div", { className: "icon" }, "\u2B95"),
              React.createElement("div", { className: "text" }, "Loading flows...")
            ),
        React.createElement(DetailPanel, {
          item: detailItem,
          onClose: function() { setDetailItem(null); },
        })
      )
    )
  );
}

// ── Mount ──
var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
