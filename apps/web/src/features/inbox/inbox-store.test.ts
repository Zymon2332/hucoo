import { describe, expect, it } from "vitest";
import { useInboxStore } from "./inbox-store";

describe("inbox store", () => {
  it("consume returns and removes the item", () => {
    const before = useInboxStore.getState().items;
    const first = before[0]!;
    const consumed = useInboxStore.getState().consume(first.id);
    expect(consumed?.id).toBe(first.id);
    expect(
      useInboxStore.getState().items.find((i) => i.id === first.id),
    ).toBeUndefined();
    useInboxStore.setState({ items: before });
  });

  it("dismiss removes an item", () => {
    const before = useInboxStore.getState().items;
    const first = before[0]!;
    useInboxStore.getState().dismiss(first.id);
    expect(useInboxStore.getState().items).toHaveLength(before.length - 1);
    useInboxStore.setState({ items: before });
  });

  it("simulate prepends an item", () => {
    const before = useInboxStore.getState().items.length;
    useInboxStore.getState().simulate();
    expect(useInboxStore.getState().items).toHaveLength(before + 1);
  });
});
