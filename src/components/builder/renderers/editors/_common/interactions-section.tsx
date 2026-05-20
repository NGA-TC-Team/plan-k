"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  allowedEventsFor,
  INTERACTION_ACTION_KINDS,
  INTERACTION_ACTION_LABEL,
  INTERACTION_EVENT_LABEL,
  type Interaction,
  type InteractionAction,
  type InteractionActionKind,
  interactionsFromBlockData,
  newInteractionId,
} from "@/builder/interaction";
import type { BlockKind } from "@/builder/types/entity";
import {
  Field,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";

type Props = {
  blockId: string;
  kind: BlockKind;
  data: Record<string, unknown>;
};

/**
 * Standalone interactions editor — same pattern as SpacingSection. Reads
 * `data.interactions` directly, dispatches UPDATE_BLOCK on every change.
 *
 * Action kinds form a discriminated union; switching the action's kind resets
 * the kind-specific payload to its defaults.
 */
export function InteractionsSection({ blockId, kind, data }: Props) {
  const dispatch = useBuilderDispatch();
  const interactions = interactionsFromBlockData(data);
  const events = allowedEventsFor(kind);

  // Screen list for the "Go to screen" action — read from the store directly.
  // Stable reference per render is fine since we only read it inside an
  // onChange handler.
  const screens = useBuilderState((s) => s.state.screens);
  const screenOptions = Object.values(screens).map((sc) => ({
    label: sc.title || sc.id.slice(0, 8),
    value: sc.id,
  }));

  function commit(next: Interaction[]) {
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: blockId,
      patch: { data: { ...data, interactions: next } },
    });
  }

  function add() {
    const next: Interaction = {
      id: newInteractionId(),
      event: events[0] ?? "tap",
      action: { kind: "none" },
    };
    commit([...interactions, next]);
  }

  function update(id: string, patch: Partial<Interaction>) {
    commit(interactions.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function remove(id: string) {
    commit(interactions.filter((it) => it.id !== id));
  }

  function changeActionKind(id: string, kind: InteractionActionKind) {
    const action = makeDefaultAction(kind);
    update(id, { action });
  }

  return (
    <section className="space-y-2 rounded-md border border-hairline p-3">
      <header className="flex items-center justify-between">
        <h3 className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Interactions
        </h3>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="size-3" />
          <span className="text-caption">Add</span>
        </Button>
      </header>
      {interactions.length === 0 ? (
        <p className="text-caption text-muted-foreground">
          No interactions. Document how a user reaches another screen, opens a
          modal, or fires a custom action from this block.
        </p>
      ) : (
        <ul className="space-y-3">
          {interactions.map((it) => (
            <li
              key={it.id}
              className="space-y-2 rounded-md bg-surface-1 p-2 ring-1 ring-hairline"
            >
              <div className="flex items-start gap-2">
                <Field label="Event" className="flex-1">
                  <SelectField
                    value={it.event}
                    onChange={(e) =>
                      update(it.id, {
                        event: e.target.value as Interaction["event"],
                      })
                    }
                    options={events.map((ev) => ({
                      label: INTERACTION_EVENT_LABEL[ev],
                      value: ev,
                    }))}
                  />
                </Field>
                <Field label="Action" className="flex-1">
                  <SelectField
                    value={it.action.kind}
                    onChange={(e) =>
                      changeActionKind(
                        it.id,
                        e.target.value as InteractionActionKind,
                      )
                    }
                    options={INTERACTION_ACTION_KINDS.map((k) => ({
                      label: INTERACTION_ACTION_LABEL[k],
                      value: k,
                    }))}
                  />
                </Field>
                <button
                  type="button"
                  aria-label="Remove interaction"
                  onClick={() => remove(it.id)}
                  className="mt-5 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <ActionPayload
                action={it.action}
                screenOptions={screenOptions}
                onChange={(action) => update(it.id, { action })}
              />
              <Field label="Note">
                <TextAreaField
                  rows={2}
                  value={it.note ?? ""}
                  onChange={(e) =>
                    update(it.id, { note: e.target.value || undefined })
                  }
                  placeholder="Why this interaction matters (design intent)"
                />
              </Field>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function makeDefaultAction(kind: InteractionActionKind): InteractionAction {
  switch (kind) {
    case "screen":
      return { kind: "screen", screenId: "" };
    case "url":
      return { kind: "url", href: "" };
    case "modal":
      return { kind: "modal", modalBlockId: "" };
    case "custom":
      return { kind: "custom", note: "" };
    case "dismiss":
      return { kind: "dismiss" };
    default:
      return { kind: "none" };
  }
}

function ActionPayload({
  action,
  screenOptions,
  onChange,
}: {
  action: InteractionAction;
  screenOptions: { label: string; value: string }[];
  onChange: (next: InteractionAction) => void;
}) {
  if (action.kind === "screen") {
    return (
      <Field label="Target screen">
        <SelectField
          value={action.screenId}
          onChange={(e) =>
            onChange({ kind: "screen", screenId: e.target.value })
          }
          placeholder="Pick a screen"
          options={screenOptions}
        />
      </Field>
    );
  }
  if (action.kind === "url") {
    return (
      <Field label="URL">
        <TextField
          value={action.href}
          onChange={(e) => onChange({ kind: "url", href: e.target.value })}
          placeholder="https://…"
        />
      </Field>
    );
  }
  if (action.kind === "modal") {
    return (
      <Field label="Target block id" hint="Block id of the modal/sheet to open">
        <TextField
          value={action.modalBlockId}
          onChange={(e) =>
            onChange({ kind: "modal", modalBlockId: e.target.value })
          }
          placeholder="Block id"
        />
      </Field>
    );
  }
  if (action.kind === "custom") {
    return (
      <Field label="Custom action">
        <TextAreaField
          rows={2}
          value={action.note}
          onChange={(e) => onChange({ kind: "custom", note: e.target.value })}
          placeholder="Describe the action"
        />
      </Field>
    );
  }
  return null;
}
