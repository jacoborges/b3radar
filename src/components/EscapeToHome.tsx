import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { escapeAction } from "@/lib/escape-nav";

const OVERLAY_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]';

function isEditable(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Esc fecha a janela aberta (as janelas já fecham pelo "x" com Esc) e,
 * sem nada aberto, leva à tela inicial. Escuta na fase de bolha para que
 * as janelas tratem a tecla antes.
 */
export function EscapeToHome() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const active = document.activeElement;
      const action = escapeAction({
        key: event.key,
        repeat: event.repeat,
        defaultPrevented: event.defaultPrevented,
        modifier: event.ctrlKey || event.metaKey || event.altKey || event.shiftKey,
        overlayOpen: document.querySelector(OVERLAY_SELECTOR) !== null,
        editableFocused: isEditable(active),
        pathname,
      });
      if (action === "ignore") return;
      event.preventDefault();
      if (action === "blur") (active as HTMLElement).blur();
      else if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else navigate({ to: "/" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, pathname]);

  return null;
}
