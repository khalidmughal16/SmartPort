import type { Suggestion } from "@/lib/data";

/** Result tile shared by Gate-In and Placement. `sugg` is undefined before the first request, null when the yard is full. */
export function SuggestionResult({ sugg, empty, onConfirm }: { sugg: Suggestion | null | undefined; empty: string; onConfirm: () => void }) {
  return (
    <div className="tile" id="res">
      {sugg === undefined ? empty : sugg === null ? <p>All stacks are at maximum height. Free a slot first.</p> : (
        <>
          <p><b>Bay {sugg.col + 1}, tier {sugg.tier + 1}</b> in the {sugg.zone}. Extra moves: {sugg.e}. Reason: the stack with the fewest containers that leave earlier than this one.</p>
          <button className="btn p" onClick={onConfirm}>Confirm placement</button>
        </>
      )}
    </div>
  );
}
