#!/usr/bin/env python3
"""
Wires the AI suggestion button + review dialog into your own
CreatePrescription.jsx (the Create Prescription modal).

Run it from the folder that holds CreatePrescription.jsx:
    python3 apply_createprescription_wiring.py

It asserts on every anchor, so if your file has drifted since 16 Oct it
stops without writing anything rather than half-applying. Keeps CRLF.
"""
p='CreatePrescription.jsx'
s=open(p, newline='').read().replace('\r\n','\n')

old='''import ChiefComplaintInput from "./ChiefComplaintInput";'''
new='''import ChiefComplaintInput from "./ChiefComplaintInput";
import AiSuggestDialog from "./AiSuggestDialog";'''
assert old in s; s=s.replace(old,new,1)

old='''  const lookupSeq     = useRef(0);'''
new='''  const [aiOpen, setAiOpen]                     = useState(false);   // AI suggestion dialog
  const lookupSeq     = useRef(0);'''
assert old in s; s=s.replace(old,new,1)

old='''  /* Chief complaint confirmed (picked, Enter, left the box, or an
     appointment was selected) → look for a saved Rx */'''
new='''  /* ── AI suggestion → pad (only after the doctor reviewed it in the dialog) ──
     Consultation types and doctor notes are left as they are. */
  const applyAiSuggestion = (draft, mode = "replace") => {
    const { medicines: curMeds, tests: curTests, draftNotes: d } = padRef.current;
    const keep = (mine, saved) => (hasText(mine) ? mine : saved || "");

    if (mode === "merge") {
      setMedicines(mergeUnique(curMeds, draft.medicines, medKey));
      setTests(mergeUnique(curTests, draft.tests, testKey));
      setNotes({
        ...d,
        diagnosis:     keep(d.diagnosis, draft.diagnosis),
        treatmentPlan: keep(d.treatmentPlan, draft.treatment_plan),
      });
    } else {
      setMedicines(draft.medicines);
      setTests(draft.tests);
      setNotes({
        ...d,
        diagnosis:     draft.diagnosis || "",
        treatmentPlan: draft.treatment_plan || "",
      });
    }

    setPadVersion((v) => v + 1);
    setAppliedTemplate({ complaint: draft.chief_complaint, source: "ai", merged: mode === "merge" });
    setPendingTemplate(null);
    setAiOpen(false);
  };

  /* Chief complaint confirmed (picked, Enter, left the box, or an
     appointment was selected) → look for a saved Rx */'''
assert old in s; s=s.replace(old,new,1)

# button under complaint in left panel
old='''                      {lookingUp && <div className="cct-hint">Looking for a saved Rx…</div>}'''
new='''                      {lookingUp && <div className="cct-hint">Looking for a saved Rx…</div>}
                      <button
                        type="button"
                        className="cct-ai-btn"
                        disabled={!hasText(draftNotes.chiefComplaint)}
                        onClick={() => setAiOpen(true)}
                        title="Draft diagnosis, plan, medicines and tests with AI — you review before anything is added"
                      >
                        ✨ Suggest with AI
                      </button>'''
assert old in s; s=s.replace(old,new,1)

# applied note: ai variant
old='''                      {appliedTemplate && !pendingTemplate && (
                        <div className="cct-applied">
                          ✨ {appliedTemplate.merged ? "Added items from" : "Filled from"}{" "}
                          {appliedTemplate.source === "clinic" && appliedTemplate.doctorName
                            ? `${appliedTemplate.doctorName}'s`
                            : "your"}{" "}
                          saved Rx for “{appliedTemplate.complaint}” — medicines, tests, consultation
                          and notes are all editable.
                          <button type="button" className="cct-link" onClick={() => setAppliedTemplate(null)}>
                            Dismiss
                          </button>
                        </div>
                      )}'''
new='''                      {appliedTemplate && !pendingTemplate && appliedTemplate.source === "ai" && (
                        <div className="cct-applied ai">
                          ✨ {appliedTemplate.merged ? "Added items from" : "Filled from"} the AI suggestion
                          for “{appliedTemplate.complaint}” — check every medicine, dose and test before
                          saving.
                          <button type="button" className="cct-link" onClick={() => setAppliedTemplate(null)}>
                            Dismiss
                          </button>
                        </div>
                      )}

                      {appliedTemplate && !pendingTemplate && appliedTemplate.source !== "ai" && (
                        <div className="cct-applied">
                          ✨ {appliedTemplate.merged ? "Added items from" : "Filled from"}{" "}
                          {appliedTemplate.source === "clinic" && appliedTemplate.doctorName
                            ? `${appliedTemplate.doctorName}'s`
                            : "your"}{" "}
                          saved Rx for “{appliedTemplate.complaint}” — medicines, tests, consultation
                          and notes are all editable.
                          <button type="button" className="cct-link" onClick={() => setAppliedTemplate(null)}>
                            Dismiss
                          </button>
                        </div>
                      )}'''
assert old in s; s=s.replace(old,new,1)

# mount dialog before preview dialog
old='''        {/* ── Preview Dialog ── */}'''
new='''        {/* ── AI suggestion review ── */}
        <AiSuggestDialog
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          complaint={(draftNotes.chiefComplaint || "").trim()}
          patientId={patientId}
          padHasContent={
            medicines.length > 0 || tests.length > 0 ||
            hasText(draftNotes.diagnosis) || hasText(draftNotes.treatmentPlan)
          }
          onApply={applyAiSuggestion}
        />

        {/* ── Preview Dialog ── */}'''
assert old in s; s=s.replace(old,new,1)

# reset: close dialog on reset
old='''    setNotes({ ...EMPTY_NOTES });   // previously kept the last patient's notes
    clearTemplateState();'''
new='''    setNotes({ ...EMPTY_NOTES });   // previously kept the last patient's notes
    clearTemplateState();
    setAiOpen(false);'''
assert old in s; s=s.replace(old,new,1)
open(p,'w',newline='').write(s.replace('\n','\r\n'))
print("ok")
print("CreatePrescription.jsx wired for AI suggestions")
