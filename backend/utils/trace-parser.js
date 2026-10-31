const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');

let AdmZip;
try { AdmZip = require('adm-zip'); } catch {}

function openZip(zipPath) {
  if (!fs.existsSync(zipPath)) return null;
  if (!AdmZip) {
    const JSZip = require('jszip');
    const buf = fs.readFileSync(zipPath);
    return { type: 'jszip', zip: new JSZip().loadAsync(buf) };
  }
  return { type: 'adm', zip: new AdmZip(zipPath) };
}

function parseJsonLines(text) {
  return text.trim().split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function readEntry(zip, entryName) {
  if (!zip) return null;
  try {
    const entry = zip.getEntry(entryName);
    if (!entry) return null;
    return zip.readAsText(entry);
  } catch { return null; }
}

function readEntryBuffer(zip, entryName) {
  if (!zip) return null;
  try {
    const entry = zip.getEntry(entryName);
    if (!entry) return null;
    return zip.readFile(entry);
  } catch { return null; }
}

function listEntries(zip) {
  if (!zip) return [];
  return zip.getEntries().map(e => ({
    name: e.entryName,
    size: e.header.size,
    compressedSize: e.header.compressedSize,
  }));
}

function parseActions(zipPath) {
  const zip = new (require('adm-zip'))(zipPath);
  const entries = listEntries(zip);
  const traceFiles = entries.filter(e => e.name.endsWith('-trace.trace') || e.name === 'test.trace').map(e => e.name);

  // Find wall-time offset from context-options event
  let timeOffset = 0;
  const testTraceText = readEntry(zip, 'test.trace');
  if (testTraceText) {
    const ctxEvent = parseJsonLines(testTraceText).find(e => e.type === 'context-options');
    if (ctxEvent && ctxEvent.wallTime && ctxEvent.monotonicTime) {
      timeOffset = ctxEvent.wallTime - ctxEvent.monotonicTime * 1000;
    }
  }

  const allActions = [];
  for (const file of traceFiles) {
    const text = readEntry(zip, file);
    if (!text) continue;
    const events = parseJsonLines(text);

    const beforeMap = new Map();
    for (const ev of events) {
      if (ev.type === 'before') {
        beforeMap.set(ev.callId, ev);
      } else if (ev.type === 'after' && beforeMap.has(ev.callId)) {
        const before = beforeMap.get(ev.callId);
        allActions.push({
          callId: ev.callId,
          title: before.title || '',
          startTime: before.startTime,
          endTime: ev.endTime,
          wallTime: Math.round(before.startTime * 1000 + timeOffset),
          duration: Math.round((ev.endTime - before.startTime) * 1000) / 1000,
          params: before.params || {},
          error: ev.error || null,
          source: before.stack?.[0] || null,
          file: file.replace('-trace.trace', '').replace('test.trace', 'test'),
        });
      }
    }
  }

  allActions.sort((a, b) => a.startTime - b.startTime);

  const screenshotEntries = entries
    .filter(e => e.name.startsWith('resources/page@') && (e.name.endsWith('.jpeg') || e.name.endsWith('.png')))
    .map(e => {
      const match = e.name.match(/page@([^-]+)-(\d+)\.(jpeg|png)$/);
      return match ? { name: e.name, pageId: match[1], timestamp: parseInt(match[2]), ext: match[3] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);

  return { actions: allActions, screenshots: screenshotEntries };
}

function parseNetwork(zipPath) {
  const zip = new (require('adm-zip'))(zipPath);
  const entries = listEntries(zip);
  const networkFiles = entries.filter(e => e.name.endsWith('-trace.network')).map(e => e.name);

  const requests = [];
  for (const file of networkFiles) {
    const text = readEntry(zip, file);
    if (!text) continue;
    const events = parseJsonLines(text);

    for (const ev of events) {
      if (ev.type !== 'resource-snapshot' || !ev.snapshot) continue;
      const s = ev.snapshot;
      requests.push({
        method: s.request?.method || '',
        url: s.request?.url || '',
        status: s.response?.status || 0,
        statusText: s.response?.statusText || '',
        startTime: s.startedDateTime || '',
        duration: s.time || 0,
        requestHeaders: s.request?.headers || [],
        responseHeaders: s.response?.headers || [],
        requestSize: s.request?.bodySize || 0,
        responseSize: s.response?.content?.size || 0,
        mimeType: s.response?.content?.mimeType || '',
      });
    }
  }

  return { requests };
}

function parseConsole(zipPath) {
  const zip = new (require('adm-zip'))(zipPath);
  const entries = listEntries(zip);

  const logs = [];
  const jsonResources = entries.filter(e => e.name.startsWith('resources/') && e.name.endsWith('.json'));

  for (const entry of jsonResources) {
    const text = readEntry(zip, entry.name);
    if (!text) continue;
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type && item.text) {
            logs.push({ type: item.type, text: item.text, timestamp: item.timestamp || null, source: item.location || null });
          }
        }
      }
    } catch {}
  }

  return { logs };
}

function parseStacks(zipPath) {
  const zip = new (require('adm-zip'))(zipPath);
  const entries = listEntries(zip);
  const stackFiles = entries.filter(e => e.name.endsWith('-trace.stacks') || e.name === 'test.stacks').map(e => e.name);

  const stacks = {};
  for (const file of stackFiles) {
    const text = readEntry(zip, file);
    if (!text) continue;
    const events = parseJsonLines(text);
    for (const ev of events) {
      if (ev.callId && ev.frames) {
        stacks[ev.callId] = ev.frames;
      }
    }
  }

  return { stacks };
}

function parseSources(zipPath) {
  const zip = new (require('adm-zip'))(zipPath);
  const entries = listEntries(zip);
  const srcFiles = entries.filter(e => e.name.startsWith('resources/src@') && e.name.endsWith('.txt'));

  const files = {};
  for (const entry of srcFiles) {
    const text = readEntry(zip, entry.name);
    if (text) files[entry.name] = text;
  }

  return { files };
}

function getMeta(zipPath) {
  const stat = fs.statSync(zipPath);
  const zip = new (require('adm-zip'))(zipPath);
  const entries = listEntries(zip);

  const traceText = readEntry(zip, 'test.trace');
  const events = traceText ? parseJsonLines(traceText) : [];
  const contextOpts = events.find(e => e.type === 'context-options');

  return {
    size: stat.size,
    entries: entries.length,
    screenshotCount: entries.filter(e => e.name.startsWith('resources/page@')).length,
    domSnapshotCount: entries.filter(e => e.name.startsWith('resources/') && e.name.endsWith('.html')).length,
    networkFileCount: entries.filter(e => e.name.endsWith('-trace.network')).length,
    playwrightVersion: contextOpts?.playwrightVersion || null,
    browserName: contextOpts?.browserName || null,
    platform: contextOpts?.platform || null,
  };
}

function getResource(zipPath, resourceName) {
  const zip = new (require('adm-zip'))(zipPath);
  const fullName = resourceName.startsWith('resources/') ? resourceName : `resources/${resourceName}`;
  return readEntryBuffer(zip, fullName);
}

module.exports = { parseActions, parseNetwork, parseConsole, parseStacks, parseSources, getMeta, getResource, listEntries: (zipPath) => { const zip = new (require('adm-zip'))(zipPath); return listEntries(zip); } };
