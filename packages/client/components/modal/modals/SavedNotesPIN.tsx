import { createSignal, For, onCleanup, onMount } from "solid-js";

import { styled } from "styled-system/jsx";

import { Column, Dialog, DialogProps } from "@revolt/ui";

import { clearPIN, isPINEnabled, setPIN, verifyPIN } from "../../../src/lib/savedNotesPIN";
import { Modals } from "../types";

const PINDisplay = styled("div", {
  base: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    padding: "8px 0 4px",
  },
});

const PINDot = styled("div", {
  base: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: "2px solid var(--md-sys-color-outline)",
    transition: "background 0.15s, border-color 0.15s",
  },
  variants: {
    filled: {
      true: {
        background: "var(--md-sys-color-primary)",
        borderColor: "var(--md-sys-color-primary)",
      },
    },
    error: {
      true: {
        background: "var(--md-sys-color-error)",
        borderColor: "var(--md-sys-color-error)",
      },
    },
  },
});

const Keypad = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginTop: "8px",
  },
});

const Key = styled("button", {
  base: {
    height: "52px",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-variant)",
    color: "var(--md-sys-color-on-surface-variant)",
    fontSize: "20px",
    fontWeight: "500",
    border: "none",
    cursor: "pointer",
    transition: "background 0.1s",
    _hover: { background: "var(--md-sys-color-surface-container-high)" },
    _active: { background: "var(--md-sys-color-surface-container-highest)" },
    _disabled: { opacity: 0.4, cursor: "default" },
  },
});

const Hint = styled("p", {
  base: {
    textAlign: "center",
    fontSize: "13px",
    color: "var(--md-sys-color-outline)",
    margin: "0",
    minHeight: "20px",
  },
});

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"] as const;

export function SavedNotesPINModal(
  props: DialogProps & Modals & { type: "saved_notes_pin" },
) {
  const [pin, setPin] = createSignal("");
  const [error, setError] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  async function handleKey(key: string) {
    if (busy()) return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (pin().length >= 4) return;
    const next = pin() + key;
    setPin(next);
    if (next.length === 4) {
      setBusy(true);
      const ok = await verifyPIN(next);
      if (ok) {
        props.onClose();
        props.onSuccess();
      } else {
        setError(true);
        setPin("");
        setBusy(false);
      }
    }
  }

  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) handleKey(e.key);
      else if (e.key === "Backspace") handleKey("⌫");
      else if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title="저장된 메모 잠금 해제"
      actions={[{ text: "취소" }]}
      isDisabled={busy()}
    >
      <Column>
        <PINDisplay>
          <For each={[0, 1, 2, 3]}>
            {(i) => (
              <PINDot filled={pin().length > i} error={error()} />
            )}
          </For>
        </PINDisplay>
        <Hint>{error() ? "PIN이 올바르지 않습니다." : " "}</Hint>
        <Keypad>
          <For each={KEYS}>
            {(key) => (
              <Key
                disabled={key === "" || busy()}
                style={key === "" ? "visibility: hidden" : undefined}
                onClick={() => key && handleKey(key)}
              >
                {key}
              </Key>
            )}
          </For>
        </Keypad>
      </Column>
    </Dialog>
  );
}

export function SavedNotesPINSetupModal(
  props: DialogProps & Modals & { type: "saved_notes_pin_setup" },
) {
  const [step, setStep] = createSignal<"menu" | "verify_remove" | "enter" | "confirm">(
    isPINEnabled() ? "menu" : "enter",
  );
  const [first, setFirst] = createSignal("");
  const [pin, setPin] = createSignal("");
  const [error, setError] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  async function handleKey(key: string) {
    if (busy()) return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (pin().length >= 4) return;
    const next = pin() + key;
    setPin(next);
    if (next.length < 4) return;

    if (step() === "verify_remove") {
      setBusy(true);
      const ok = await verifyPIN(next);
      if (ok) {
        clearPIN();
        props.onClose();
      } else {
        setError(true);
        setPin("");
        setBusy(false);
      }
    } else if (step() === "enter") {
      setFirst(next);
      setPin("");
      setStep("confirm");
    } else if (step() === "confirm") {
      if (next === first()) {
        setBusy(true);
        await setPIN(next);
        props.onClose();
      } else {
        setError(true);
        setPin("");
        setFirst("");
        setStep("enter");
      }
    }
  }

  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (step() === "menu") return;
      if (/^[0-9]$/.test(e.key)) handleKey(e.key);
      else if (e.key === "Backspace") handleKey("⌫");
      else if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  const title = () => {
    switch (step()) {
      case "menu": return "PIN 관리";
      case "verify_remove": return "PIN 해제 확인";
      case "enter": return "새 PIN 입력";
      case "confirm": return "PIN 재입력 (확인)";
    }
  };

  const hint = () => {
    if (error()) {
      return step() === "verify_remove"
        ? "PIN이 올바르지 않습니다."
        : "PIN이 일치하지 않습니다. 다시 입력하세요.";
    }
    if (step() === "verify_remove") return "현재 PIN을 입력하세요.";
    if (step() === "confirm") return "동일한 PIN을 한 번 더 입력하세요.";
    return " ";
  };

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={title()}
      actions={
        step() === "menu"
          ? [
              { text: "취소" },
              {
                text: "PIN 변경",
                onClick: () => {
                  setStep("enter");
                  return false;
                },
              },
              {
                text: "PIN 해제",
                onClick: () => {
                  setPin("");
                  setError(false);
                  setStep("verify_remove");
                  return false;
                },
              },
            ]
          : [{ text: "취소" }]
      }
      isDisabled={busy()}
    >
      <Column>
        {step() !== "menu" && (
          <>
            <PINDisplay>
              <For each={[0, 1, 2, 3]}>
                {(i) => <PINDot filled={pin().length > i} error={error()} />}
              </For>
            </PINDisplay>
            <Hint>{hint()}</Hint>
            <Keypad>
              <For each={KEYS}>
                {(key) => (
                  <Key
                    disabled={key === "" || busy()}
                    style={key === "" ? "visibility: hidden" : undefined}
                    onClick={() => key && handleKey(key)}
                  >
                    {key}
                  </Key>
                )}
              </For>
            </Keypad>
          </>
        )}
      </Column>
    </Dialog>
  );
}
