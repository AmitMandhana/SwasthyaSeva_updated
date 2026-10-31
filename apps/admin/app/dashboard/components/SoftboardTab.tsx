"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, GripVertical, Trash2, Pencil, X, Check, MoveRight, ExternalLink } from "lucide-react";
import { Button, Modal, TextField, TextAreaField, ConfirmModal, useToast } from "@swasthyaseva/ui";
import {
  getSoftboard, createSoftboardColumn, updateSoftboardColumn, deleteSoftboardColumn,
  reorderSoftboardColumns, createSoftboardCard, updateSoftboardCard, deleteSoftboardCard,
  moveSoftboardCard, type SoftboardColumn, type SoftboardCard,
} from "@/lib/api";
import { componentTestSpec } from "@swasthyaseva/test-gen";

export default function SoftboardTab() {
  const [columns, setColumns] = useState<SoftboardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState("");
  const [deleteColumnId, setDeleteColumnId] = useState<number | null>(null);

  const [addingCardColumnId, setAddingCardColumnId] = useState<number | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardLinkText, setNewCardLinkText] = useState("");
  const [newCardLinkUrl, setNewCardLinkUrl] = useState("");
  const [editingCard, setEditingCard] = useState<SoftboardCard | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardDesc, setEditCardDesc] = useState("");
  const [editCardLinkText, setEditCardLinkText] = useState("");
  const [editCardLinkUrl, setEditCardLinkUrl] = useState("");
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [moveCardState, setMoveCardState] = useState<{ card: SoftboardCard } | null>(null);

  const dragCardRef = useRef<{ cardId: number; fromColumnId: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const { columns: cols } = await getSoftboard();
      setColumns(cols);
    } catch {
      addToast("Failed to load board", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  async function handleAddColumn() {
    if (!newColumnTitle.trim()) return;
    try {
      await createSoftboardColumn(newColumnTitle.trim());
      setNewColumnTitle("");
      setAddingColumn(false);
      await load();
    } catch { addToast("Failed to create column", "error"); }
  }

  async function handleSaveColumnTitle(columnId: number) {
    if (!editColumnTitle.trim()) return;
    try {
      await updateSoftboardColumn(columnId, editColumnTitle.trim());
      await load();
      setEditingColumnId(null);
    } catch { addToast("Failed to update column", "error"); }
  }

  async function handleDeleteColumn() {
    if (!deleteColumnId) return;
    try {
      await deleteSoftboardColumn(deleteColumnId);
      setDeleteColumnId(null);
      await load();
      addToast("Column deleted", "success");
    } catch { addToast("Failed to delete column", "error"); }
  }

  async function handleAddCard(columnId: number) {
    if (!newCardTitle.trim()) return;
    try {
      await createSoftboardCard(columnId, newCardTitle.trim(), undefined, newCardLinkText || undefined, newCardLinkUrl || undefined);
      setNewCardTitle("");
      setNewCardLinkText("");
      setNewCardLinkUrl("");
      setAddingCardColumnId(null);
      await load();
    } catch { addToast("Failed to create card", "error"); }
  }

  async function handleSaveCard() {
    if (!editingCard || !editCardTitle.trim()) return;
    try {
      await updateSoftboardCard(editingCard.card_id, { title: editCardTitle.trim(), description: editCardDesc || null, link_text: editCardLinkText || null, link_url: editCardLinkUrl || null });
      await load();
      setEditingCard(null);
    } catch { addToast("Failed to update card", "error"); }
  }

  async function handleDeleteCard() {
    if (!deleteCardId) return;
    try {
      await deleteSoftboardCard(deleteCardId);
      setDeleteCardId(null);
      await load();
    } catch { addToast("Failed to delete card", "error"); }
  }

  async function handleMoveCard(targetColumnId: number) {
    if (!moveCardState) return;
    try {
      const targetCol = columns.find(c => c.column_id === targetColumnId);
      const pos = targetCol ? targetCol.cards.length : 0;
      await moveSoftboardCard(moveCardState.card.card_id, targetColumnId, pos);
      setMoveCardState(null);
      await load();
    } catch { addToast("Failed to move card", "error"); }
  }

  function handleDragStart(cardId: number, fromColumnId: number) {
    dragCardRef.current = { cardId, fromColumnId };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(targetColumnId: number) {
    const drag = dragCardRef.current;
    if (!drag || drag.fromColumnId === targetColumnId) { dragCardRef.current = null; return; }

    const targetCol = columns.find(c => c.column_id === targetColumnId);
    const pos = targetCol ? targetCol.cards.length : 0;
    try {
      await moveSoftboardCard(drag.cardId, targetColumnId, pos);
      await load();
    } catch { addToast("Failed to move card", "error"); }
    dragCardRef.current = null;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-alt">Loading board...</div>;
  }

  return (
    <div data-testid="softboard-container">
      <div className="flex items-start gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {columns.map(col => (
          <div
            key={col.column_id}
            data-testid={`softboard-column-${col.column_id}`}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-lg border border-border"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(col.column_id)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
              {editingColumnId === col.column_id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    autoFocus
                    data-testid="rename-column-input"
                    value={editColumnTitle}
                    onChange={(e) => setEditColumnTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveColumnTitle(col.column_id); if (e.key === 'Escape') setEditingColumnId(null); }}
                    className="flex-1 px-2 py-1 text-sm rounded border border-input bg-background text-card-alt"
                  />
                  <button data-testid="rename-column-save" onClick={() => handleSaveColumnTitle(col.column_id)} className="text-success hover:text-success/80 p-1"><Check size={18} /></button>
                  <button data-testid="rename-column-cancel" onClick={() => setEditingColumnId(null)} className="text-muted-alt hover:text-card-alt p-1"><X size={18} /></button>
                </div>
              ) : (
                <>
                  <GripVertical size={16} className="text-muted-alt cursor-grab" />
                  <h3 data-testid="column-title" className="flex-1 text-sm font-semibold text-card-alt truncate">{col.title}</h3>
                  <span className="text-xs text-muted-alt bg-muted rounded-full px-2 py-0.5">{col.cards.length}</span>
                  <button data-testid="column-rename-btn" onClick={() => { setEditingColumnId(col.column_id); setEditColumnTitle(col.title); }} className="text-muted-alt hover:text-card-alt p-1"><Pencil size={16} /></button>
                  <button data-testid="column-delete-btn" onClick={() => setDeleteColumnId(col.column_id)} className="text-muted-alt hover:text-destructive p-1"><Trash2 size={16} /></button>
                </>
              )}
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[60px]">
              {col.cards.map(card => (
                <div
                  key={card.card_id}
                  draggable
                  onDragStart={() => handleDragStart(card.card_id, col.column_id)}
                  className="bg-card rounded-md border border-border p-3 cursor-grab hover:shadow-sm transition-shadow group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p data-testid="card-title" className="text-sm font-medium text-card-alt flex-1">{card.title}</p>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button data-testid="card-edit-btn" onClick={() => { setEditingCard(card); setEditCardTitle(card.title); setEditCardDesc(card.description || ""); setEditCardLinkText(card.link_text || ""); setEditCardLinkUrl(card.link_url || ""); }} className="text-muted-alt hover:text-card-alt p-0.5"><Pencil size={15} /></button>
                      <button data-testid="card-move-btn" onClick={() => setMoveCardState({ card })} className="text-muted-alt hover:text-primary p-0.5"><MoveRight size={15} /></button>
                      <button data-testid="card-delete-btn" onClick={() => setDeleteCardId(card.card_id)} className="text-muted-alt hover:text-destructive p-0.5"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {card.description && <p className="text-xs text-muted-alt mt-1 line-clamp-2">{card.description}</p>}
                  {card.link_url && (
                    <a href={card.link_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1.5 flex items-center gap-1.5">
                      <ExternalLink size={14} /> {card.link_text || card.link_url}
                    </a>
                  )}
                </div>
              ))}

              {/* Add card inline */}
              {addingCardColumnId === col.column_id ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    data-testid="new-card-input"
                    placeholder="Card title..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setAddingCardColumnId(null); setNewCardTitle(""); setNewCardLinkText(""); setNewCardLinkUrl(""); } }}
                    className="w-full px-3 py-2 text-sm rounded border border-input bg-background text-card-alt"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Link text"
                      value={newCardLinkText}
                      onChange={(e) => setNewCardLinkText(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded border border-input bg-background text-card-alt"
                    />
                    <input
                      placeholder="Link URL"
                      value={newCardLinkUrl}
                      onChange={(e) => setNewCardLinkUrl(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded border border-input bg-background text-card-alt"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button data-testid="new-card-add-btn" onClick={() => handleAddCard(col.column_id)} variant="primary" className="text-xs py-1 px-3">Add</Button>
                    <Button data-testid="new-card-cancel-btn" onClick={() => { setAddingCardColumnId(null); setNewCardTitle(""); setNewCardLinkText(""); setNewCardLinkUrl(""); }} variant="secondary" className="text-xs py-1 px-3">Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  data-testid={`add-card-${col.column_id}`}
                  onClick={() => { setAddingCardColumnId(col.column_id); setNewCardTitle(""); setNewCardLinkText(""); setNewCardLinkUrl(""); }}
                  className="w-full text-left px-3 py-2 text-sm text-muted-alt hover:text-card-alt hover:bg-muted/50 rounded transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add card
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add column */}
        {addingColumn ? (
          <div className="flex-shrink-0 w-72 bg-muted/30 rounded-lg border border-border p-3 space-y-2">
            <input
              autoFocus
              data-testid="new-column-input"
              placeholder="Column title..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(""); } }}
              className="w-full px-3 py-2 text-sm rounded border border-input bg-background text-card-alt"
            />
            <div className="flex gap-2">
              <Button data-testid="new-column-add-btn" onClick={handleAddColumn} variant="primary" className="text-xs py-1 px-3">Add</Button>
              <Button data-testid="new-column-cancel-btn" onClick={() => { setAddingColumn(false); setNewColumnTitle(""); }} variant="secondary" className="text-xs py-1 px-3">Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            data-testid="add-column-button"
            onClick={() => setAddingColumn(true)}
            className="flex-shrink-0 w-72 h-12 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-alt hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} /> Add column
          </button>
        )}
      </div>

      {/* Edit card modal */}
      {editingCard && (
        <Modal title="Edit Card" onClose={() => setEditingCard(null)} footer={
          <div className="flex gap-3">
            <Button onClick={handleSaveCard} variant="primary" className="flex-1">Save</Button>
            <Button onClick={() => setEditingCard(null)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        }>
          <div className="space-y-4">
            <TextField label="Title" data-testid="edit-card-title" value={editCardTitle} onChange={setEditCardTitle} required />
            <TextAreaField label="Description" value={editCardDesc} onChange={setEditCardDesc} rows={4} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Link Text" value={editCardLinkText} onChange={setEditCardLinkText} placeholder="Click here" />
              <TextField label="Link URL" value={editCardLinkUrl} onChange={setEditCardLinkUrl} placeholder="https://..." />
            </div>
          </div>
        </Modal>
      )}

      {/* Move card modal */}
      {moveCardState && (
        <Modal title="Move Card" onClose={() => setMoveCardState(null)}>
          <p className="text-sm text-muted-alt mb-4">Move &ldquo;{moveCardState.card.title}&rdquo; to:</p>
          <div className="space-y-2">
            {columns.filter(c => c.column_id !== moveCardState.card.column_id).map(col => (
              <button
                key={col.column_id}
                data-testid="move-target-column"
                onClick={() => handleMoveCard(col.column_id)}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 text-sm text-card-alt transition-colors"
              >
                {col.title} <span className="text-muted-alt">({col.cards.length} cards)</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete column confirm */}
      {deleteColumnId && (
        <ConfirmModal
          title="Delete Column"
          message="Are you sure? All cards in this column will be deleted."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteColumn}
          onCancel={() => setDeleteColumnId(null)}
        />
      )}

      {/* Delete card confirm */}
      {deleteCardId && (
        <ConfirmModal
          title="Delete Card"
          message="Are you sure you want to delete this card?"
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteCard}
          onCancel={() => setDeleteCardId(null)}
        />
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Softboard Tab',
  elements: {
    // ── Tab button ──
    softboardTab: { role: 'button', name: /Softboard/ },

    // ── Board container ──
    boardContainer: { testId: 'softboard-container' },

    // ── Add column ──
    addColumnBtn: { testId: 'add-column-button' },
    newColumnInput: { testId: 'new-column-input' },
    newColumnAddBtn: { testId: 'new-column-add-btn' },
    newColumnCancelBtn: { testId: 'new-column-cancel-btn' },

    // ── Column header ──
    columnTitle: { testId: 'column-title' },
    columnRenameBtn: { testId: 'column-rename-btn' },
    columnDeleteBtn: { testId: 'column-delete-btn' },
    renameColumnInput: { testId: 'rename-column-input' },
    renameColumnSave: { testId: 'rename-column-save' },
    renameColumnCancel: { testId: 'rename-column-cancel' },

    // ── Cards ──
    cardTitle: { testId: 'card-title' },
    cardEditBtn: { testId: 'card-edit-btn' },
    cardMoveBtn: { testId: 'card-move-btn' },
    cardDeleteBtn: { testId: 'card-delete-btn' },

    // ── Add card inline ──
    addCardBtn: { role: 'button', name: 'Add card' },
    newCardInput: { testId: 'new-card-input' },
    newCardAddBtn: { testId: 'new-card-add-btn' },
    newCardCancelBtn: { testId: 'new-card-cancel-btn' },

    // ── Edit card modal ──
    editCardModal: { role: 'dialog', name: 'Edit Card' },
    editCardTitleInput: { testId: 'edit-card-title' },
    editCardDescInput: { role: 'textbox', name: 'Description' },
    editCardSaveBtn: { role: 'button', name: 'Save' },
    editCardCancelBtn: { role: 'button', name: 'Cancel' },

    // ── Move card modal ──
    moveCardModal: { role: 'dialog', name: 'Move Card' },
    moveTargetColumn: { testId: 'move-target-column' },

    // ── Confirm modals ──
    confirmDeleteBtn: { testId: 'confirm-action-btn' },
    confirmCancelBtn: { testId: 'confirm-cancel-btn' },
    deleteColumnHeading: { role: 'heading', name: 'Delete Column' },
    deleteCardHeading: { role: 'heading', name: 'Delete Card' },

    // ── Toast ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    // ── 1. View softboard ──
    {
      name: 'view softboard columns',
      steps: [
        { do: 'waitFor', on: 'softboardTab' },
        { do: 'click', on: 'softboardTab' },
        { do: 'waitFor', on: 'boardContainer' },
        { expect: 'visible', on: 'boardContainer' },
        { expect: 'visible', on: 'addColumnBtn' },
      ],
    },

    // ── 2. Create a column ──
    {
      name: 'create a column',
      steps: [
        { do: 'waitFor', on: 'softboardTab' },
        { do: 'click', on: 'softboardTab' },
        { do: 'waitFor', on: 'boardContainer' },
        { do: 'click', on: 'addColumnBtn' },
        { expect: 'visible', on: 'newColumnInput' },
        { do: 'fill', on: 'newColumnInput', value: '[E2E] Test Column' },
        { do: 'click', on: 'newColumnAddBtn' },
        { do: 'waitFor', on: 'columnTitle' },
        { expect: 'countMin', on: 'columnTitle', value: 1 },
      ],
    },

    // ── 3. Rename a column ──
    {
      name: 'rename a column',
      after: 'create a column',
      steps: [
        { do: 'click', on: 'columnRenameBtn' },
        { expect: 'visible', on: 'renameColumnInput' },
        { do: 'fill', on: 'renameColumnInput', value: '[E2E] Renamed Column' },
        { do: 'click', on: 'renameColumnSave' },
        { do: 'waitFor', on: 'columnTitle' },
        { expect: 'countMin', on: 'columnTitle', value: 1 },
      ],
    },

    // ── 4. Create a card in a column ──
    {
      name: 'create a card',
      after: 'create a column',
      steps: [
        { do: 'click', on: 'addCardBtn' },
        { expect: 'visible', on: 'newCardInput' },
        { do: 'fill', on: 'newCardInput', value: '[E2E] Test Card' },
        { do: 'click', on: 'newCardAddBtn' },
        { do: 'waitFor', on: 'cardTitle' },
        { expect: 'countMin', on: 'cardTitle', value: 1 },
      ],
    },

    // ── 5. Edit a card (title + description) ──
    {
      name: 'edit a card',
      after: 'create a card',
      steps: [
        { do: 'click', on: 'cardEditBtn' },
        { do: 'waitFor', on: 'editCardModal' },
        { expect: 'visible', on: 'editCardTitleInput' },
        { do: 'fill', on: 'editCardTitleInput', value: '[E2E] Updated Title' },
        { do: 'fill', on: 'editCardDescInput', value: '[E2E] Updated card description' },
        { do: 'click', on: 'editCardSaveBtn' },
        { expect: 'hidden', on: 'editCardModal' },
        { do: 'waitFor', on: 'cardTitle' },
      ],
    },

    {
      name: 'edited card values persist when reopened',
      after: 'edit a card',
      steps: [
        { do: 'click', on: 'cardEditBtn' },
        { do: 'waitFor', on: 'editCardModal' },
        { expect: 'value', on: 'editCardTitleInput', value: '[E2E] Updated Title' },
        { expect: 'value', on: 'editCardDescInput', value: '[E2E] Updated card description' },
        { do: 'click', on: 'editCardCancelBtn' },
      ],
    },
    // ── 6. Delete a card ──
    {
      name: 'delete a card',
      after: 'create a card',
      steps: [
        { do: 'click', on: 'cardDeleteBtn' },
        { do: 'waitFor', on: 'deleteCardHeading' },
        { expect: 'visible', on: 'confirmDeleteBtn' },
        { do: 'click', on: 'confirmDeleteBtn' },
        { expect: 'hidden', on: 'deleteCardHeading' },
      ],
    },

    // ── 7. Move a card between columns (via modal) ──
    {
      name: 'move a card between columns',
      after: 'create a card',
      steps: [
        // First create a second column to move the card to
        { do: 'click', on: 'addColumnBtn' },
        { expect: 'visible', on: 'newColumnInput' },
        { do: 'fill', on: 'newColumnInput', value: '[E2E] Target Column' },
        { do: 'click', on: 'newColumnAddBtn' },
        { do: 'waitFor', on: 'boardContainer' },
        // Open move modal on the card
        { do: 'click', on: 'cardMoveBtn' },
        { do: 'waitFor', on: 'moveCardModal' },
        { expect: 'countMin', on: 'moveTargetColumn', value: 1 },
        { do: 'click', on: 'moveTargetColumn' },
        { expect: 'hidden', on: 'moveCardModal' },
      ],
    },

    // ── 8. Delete a column ──
    {
      name: 'delete a column',
      after: 'create a column',
      steps: [
        { do: 'click', on: 'columnDeleteBtn' },
        { do: 'waitFor', on: 'deleteColumnHeading' },
        { expect: 'visible', on: 'confirmDeleteBtn' },
        { do: 'click', on: 'confirmDeleteBtn' },
        { expect: 'hidden', on: 'deleteColumnHeading' },
      ],
    },
  ],
});
