// src/pharmacy/purchase/useLeaveGuard.js
//
// "You have unsaved work — save it, stay, or leave?"
//
// Call it with a flag that says whether there is anything to lose, and a function that
// opens your popup. While the flag is on, any move to another page made through the
// router — a sidebar link, a button that calls navigate(), a <Link> — is held back and
// handed to you instead:
//
//   useLeaveGuard(hasUnsavedWork, (proceed) => setLeavePrompt({ proceed }));
//   …
//   <Button onClick={() => { save().then(() => leavePrompt.proceed()); }}>Save to drafts</Button>
//   <Button onClick={leavePrompt.proceed}>Leave without saving</Button>
//   <Button onClick={() => setLeavePrompt(null)}>Stay here</Button>
//
// `proceed()` lets the held navigation through exactly as it was asked for.
//
// Closing the tab or reloading can't show your popup (browsers only allow their own
// "Leave site?" box), so that case gets the browser's. The browser's Back button can't be
// held back by the router at all; it is the one way out this does not cover.
//
// How it works: <BrowserRouter> hands every navigation to `navigator.push / replace`
// (react-router v6). For as long as the screen is mounted those two are wrapped; the
// originals are put back on unmount, so nothing outside this screen is ever affected.

import { useContext, useEffect, useRef } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";

export default function useLeaveGuard(when, onBlock) {
  const { navigator } = useContext(UNSAFE_NavigationContext) || {};

  // The latest values, read at click time, so the wrapper never needs re-installing.
  const whenRef = useRef(when);
  const blockRef = useRef(onBlock);
  whenRef.current = when;
  blockRef.current = onBlock;

  useEffect(() => {
    if (!navigator || typeof navigator.push !== "function") return undefined;

    const { push, replace } = navigator;
    let letThrough = false;

    const wrap = (original) =>
      function guarded(...args) {
        if (letThrough || !whenRef.current) return original.apply(navigator, args);
        blockRef.current(() => {
          letThrough = true;
          try {
            original.apply(navigator, args);
          } finally {
            letThrough = false;
          }
        });
        return undefined;
      };

    navigator.push = wrap(push);
    if (typeof replace === "function") navigator.replace = wrap(replace);

    return () => {
      navigator.push = push;
      if (typeof replace === "function") navigator.replace = replace;
    };
  }, [navigator]);

  // Closing the tab / reloading.
  useEffect(() => {
    if (!when) return undefined;
    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [when]);
}