/*
====================================================================
Skeleton.jsx

Loading placeholders shaped like the thing that is about to appear,
used instead of a bare "Loading...".

WHY SHAPED, NOT A SPINNER
-------------------------
A patient on clinic wifi waits a second or two for the form to arrive.
A spinner says only "something is happening"; a skeleton says "a form
with a header and some fields is coming", so the page doesn't visibly
jump when the real content lands.

The shimmer keyframes are injected once, on first render, rather than
added to DynamicForm.css — this component is then self-contained and
can be dropped into any screen without a matching CSS edit.
====================================================================
*/

import React from "react";

const SHIMMER_ID = "df-skeleton-keyframes";

function ensureKeyframes() {
    if (typeof document === "undefined") return;
    if (document.getElementById(SHIMMER_ID)) return;

    const style = document.createElement("style");
    style.id = SHIMMER_ID;
    style.textContent = `
@keyframes dfSkeletonShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
@media (prefers-reduced-motion: reduce) {
  .df-skeleton { animation: none !important; }
}
`;
    document.head.appendChild(style);
}

/*
  One grey bar. `w` and `h` accept any CSS length.
*/
export const SkeletonBar = ({ w = "100%", h = 14, radius = 6, style = {} }) => {
    ensureKeyframes();

    return (
        <div
            className="df-skeleton"
            style={{
                width: w,
                height: h,
                borderRadius: radius,
                background:
                    "linear-gradient(90deg, #e9eff0 25%, #f4f8f8 50%, #e9eff0 75%)",
                backgroundSize: "800px 100%",
                animation: "dfSkeletonShimmer 1.4s ease-in-out infinite",
                ...style
            }}
        />
    );
};

/* A label bar plus an input-sized block. */
export const SkeletonField = ({ full = false }) => (
    <div className={full ? "df-field df-field-full" : "df-field"}>
        <SkeletonBar w="42%" h={12} style={{ marginBottom: 8 }} />
        <SkeletonBar h={42} radius={8} />
    </div>
);

/*
  The whole form card: teal header, a couple of sections, a submit bar.
  `sections` and `fields` let a caller roughly match what is coming.
*/
export const FormSkeleton = ({ sections = 2, fields = 4, title = true }) => {
    ensureKeyframes();

    return (
        <div className="df-page">
            <div className="df-card">

                <div className="df-header">
                    {title && (
                        <SkeletonBar
                            w="55%"
                            h={22}
                            style={{
                                background:
                                    "linear-gradient(90deg, rgba(255,255,255,.25) 25%, rgba(255,255,255,.45) 50%, rgba(255,255,255,.25) 75%)",
                                backgroundSize: "800px 100%"
                            }}
                        />
                    )}
                    <SkeletonBar
                        w="35%"
                        h={12}
                        style={{
                            marginTop: 10,
                            background:
                                "linear-gradient(90deg, rgba(255,255,255,.18) 25%, rgba(255,255,255,.35) 50%, rgba(255,255,255,.18) 75%)",
                            backgroundSize: "800px 100%"
                        }}
                    />
                </div>

                <div className="df-body">
                    {Array.from({ length: sections }).map((_, s) => (
                        <div key={s} className="df-section">

                            <div className="df-section-header">
                                <SkeletonBar w={26} h={26} radius={13} />
                                <SkeletonBar w="38%" h={16} style={{ marginLeft: 10 }} />
                            </div>

                            <div className="df-field-grid">
                                {Array.from({ length: fields }).map((_, f) => (
                                    <SkeletonField key={f} full={f === fields - 1} />
                                ))}
                            </div>

                        </div>
                    ))}
                </div>

                <div className="df-submit-bar">
                    <SkeletonBar w={150} h={44} radius={22} />
                </div>

            </div>
        </div>
    );
};

/* The QR landing screen: dropdown plus a Continue button. */
export const PortalSkeleton = () => {
    ensureKeyframes();

    return (
        <div className="fp-page">
            <div className="fp-card">

                <div className="fp-header">
                    <SkeletonBar
                        w="40%"
                        h={22}
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(255,255,255,.25) 25%, rgba(255,255,255,.45) 50%, rgba(255,255,255,.25) 75%)",
                            backgroundSize: "800px 100%"
                        }}
                    />
                    <SkeletonBar
                        w="60%"
                        h={12}
                        style={{
                            marginTop: 10,
                            background:
                                "linear-gradient(90deg, rgba(255,255,255,.18) 25%, rgba(255,255,255,.35) 50%, rgba(255,255,255,.18) 75%)",
                            backgroundSize: "800px 100%"
                        }}
                    />
                </div>

                <div className="fp-body">
                    <SkeletonBar w="35%" h={12} style={{ marginBottom: 10 }} />
                    <SkeletonBar h={48} radius={8} />
                    <SkeletonBar h={48} radius={24} style={{ marginTop: 20 }} />
                </div>

            </div>
        </div>
    );
};

export default FormSkeleton;