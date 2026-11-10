/*
====================================================================
submissionSchema.js

Reads forms.form_schema the way it is ACTUALLY stored in your table,
so the edit form can render every field the form defines — including
the optional ones the patient skipped, which is the whole point of
letting a receptionist complete a submission later.

Your real shape (routes/Forms/formSchemas.js) is:

  {
    title: "Yoga Class Registration & Consent Form",
    sections: [
      {
        title: "Personal Details",
        description: "optional helper text",
        fields: [
          { name: "full_name", label: "Full Name", type: "text",
            required: true, description: "...", doctorOnly: false }
        ]
      }
    ]
  }

WHY THE OLD CODE SHOWED NOTHING
-------------------------------
1. Both SubmissionView.getEditableFields() and
   SubmissionEditForm.normalizeSchema() started with
       Array.isArray(formSchema) && formSchema[0].fields
   but your schema is an OBJECT with a `sections` key, not an array.
   Every check failed, so both fell through to the last resort:
   "build fields from Object.keys(form_data)". That can only ever show
   fields the patient already answered — blank optional fields are
   invisible by construction.

2. They keyed fields off `field.id`. There is not one `id` in
   formSchemas.js — all 152 fields use `name`. So `values[field.id]`
   was always undefined and every input rendered empty even for
   answered fields.

This module fixes both and mirrors the backend normalizer in
services/pdf/schema/normalizeSchema.js, so the editor and the PDF
always agree on which key holds which answer.
====================================================================
*/

/* Must match services/pdf/schema/normalizeSchema.js -> fieldKey().
   Your schemas only use `name`; `id` is checked for future-proofing.
   If you ever add BOTH to one field, make the two files agree or the
   editor will write a key the PDF doesn't read. */
export function fieldKey(f) {
    return f.name || f.id || f.key || f.field_id || f.label;
}

export function fieldLabel(f) {
    const l = f.label || f.title || f.name || String(fieldKey(f) || "");
    return String(l).replace(/^\w/, (c) => c.toUpperCase());
}

export function fieldOptions(f) {
    const raw = f.options || f.choices || f.values || f.items;
    if (!Array.isArray(raw)) return [];
    return raw
        .map((o) => (o && typeof o === "object" ? o.label ?? o.value ?? o.text : o))
        .filter((o) => o !== undefined && o !== null && String(o).trim() !== "")
        .map(String);
}

/* Which control to render. `checkbox` WITH options is a multi-select
   group; `checkbox` without options is a single boolean. */
export function controlFor(field) {
    const type = String(field.type || "text").toLowerCase();
    const options = fieldOptions(field);

    if (type === "checkbox") return options.length ? "checkbox-group" : "boolean";
    if (type === "yes_no" || type === "yesno") return "yes-no";
    if (type === "paragraph") return "paragraph";
    if (type === "signature") return "signature";
    if (type === "table") return "table";
    if (type === "file") return "file";
    if (type === "textarea") return "textarea";
    if (type === "radio") return "radio";
    if (type === "select" || type === "dropdown") return "select";
    if (type === "date") return "date";
    if (type === "number") return "number";
    return "text";
}

/* Identity fields that submitForm() moved into `clients` — mirrors
   CLIENT_FIELD_ALIASES in form.controller.js. These are prefilled from
   the client record and NOT saved back into form_data, otherwise the
   two copies diverge and the PDF shows the stale one. */
const CLIENT_ALIASES = {
    client_name: ["name", "full_name", "client_name", "patient_name", "participant_name"],
    client_email: ["email", "email_address"],
    client_mobile: ["mobile", "contact_number", "phone", "phone_number", "mobile_number", "phone_mobile"],
    client_address: ["address", "client_address", "home_address"],
    client_gender: ["gender"],
    client_dob: ["dob", "date_of_birth", "birth_date"],
    client_blood_group: ["blood_group", "bloodgroup", "blood_type"]
};

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** @returns {string|null} the submission column backing this field, if any */
export function clientColumnFor(key) {
    const k = norm(key);
    for (const [column, aliases] of Object.entries(CLIENT_ALIASES)) {
        if (aliases.some((a) => norm(a) === k)) return column;
    }
    return null;
}

/* Turns any stored shape into [{ title, description, fields: [...] }] */
export function normalizeSchema(formSchema, formData) {
    let root = formSchema;

    if (typeof root === "string") {
        try {
            root = JSON.parse(root);
        } catch (e) {
            root = null;
        }
    }

    let rawSections = [];

    if (root && !Array.isArray(root) && typeof root === "object") {
        if (Array.isArray(root.sections)) rawSections = root.sections;
        else if (Array.isArray(root.fields)) rawSections = [{ title: root.title || "Form Details", fields: root.fields }];
        else if (Array.isArray(root.pages)) {
            rawSections = root.pages.flatMap((p) =>
                Array.isArray(p.sections) ? p.sections : [p]
            );
        } else {
            // { "Section title": [fields] }
            rawSections = Object.entries(root)
                .filter(([, v]) => Array.isArray(v))
                .map(([title, fields]) => ({ title, fields }));
        }
    } else if (Array.isArray(root) && root.length) {
        if (root.some((s) => Array.isArray(s.fields))) {
            rawSections = root;
        } else {
            // flat array, optionally tagged with `section`
            const bySection = {};
            const order = [];
            root.forEach((f) => {
                const name = f.section || f.group || "Form Details";
                if (!(name in bySection)) {
                    bySection[name] = [];
                    order.push(name);
                }
                bySection[name].push(f);
            });
            rawSections = order.map((title) => ({ title, fields: bySection[title] }));
        }
    }

    // Genuinely no schema — fall back to the saved keys so editing still works
    if (!rawSections.length) {
        return [
            {
                title: "Submitted details",
                description: null,
                fields: Object.keys(formData || {}).map((key) => ({
                    key,
                    label: key.replace(/_/g, " "),
                    control: "text",
                    options: [],
                    required: false,
                    doctorOnly: false,
                    hint: null,
                    clientColumn: clientColumnFor(key),
                    raw: {}
                }))
            }
        ];
    }

    return rawSections
        .map((s) => ({
            title: s.title || s.name || "Form details",
            description: s.description || null,
            fields: (s.fields || []).map((f) => {
                const key = fieldKey(f);
                const control = controlFor(f);
                return {
                    key,
                    label: fieldLabel(f),
                    control,
                    options: fieldOptions(f),
                    required: Boolean(f.required),
                    doctorOnly: Boolean(f.doctorOnly),
                    // paragraph prose lives in `description`; on other types
                    // `description` is helper text
                    hint: control === "paragraph" ? null : f.description || null,
                    text: control === "paragraph" ? f.description || f.label : null,
                    columns: f.columns || [],
                    clientColumn: clientColumnFor(key),
                    raw: f
                };
            })
        }))
        .filter((s) => s.fields.length);
}

/** true when a field has no answer yet */
export function isEmptyValue(value) {
    if (value === undefined || value === null || value === "") return true;
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

/** Fields a receptionist can actually answer (paragraphs aren't answers) */
export function answerableFields(sections) {
    return sections
        .flatMap((s) => s.fields)
        .filter((f) => f.control !== "paragraph" && !f.clientColumn);
}

/**
 * Builds the editor's initial state: every schema field gets an entry,
 * answered or not, plus any stray form_data keys the schema doesn't
 * define (so nothing is silently dropped on save).
 */
export function buildInitialValues(sections, formData, submission) {
    const values = { ...(formData || {}) };

    sections.forEach((s) =>
        s.fields.forEach((f) => {
            if (f.control === "paragraph") return;

            if (f.clientColumn) {
                // display-only, sourced from the clients row
                values[f.key] = formData?.[f.key] ?? submission?.[f.clientColumn] ?? "";
                return;
            }

            if (values[f.key] !== undefined) return;

            values[f.key] =
                f.control === "checkbox-group" ? [] :
                f.control === "boolean" ? false :
                f.control === "table" ? [] : "";
        })
    );

    return values;
}

/** Strips display-only client fields and untouched blanks before saving. */
export function buildSavePayload(sections, values, originalFormData) {
    const clientKeys = new Set(
        sections.flatMap((s) => s.fields).filter((f) => f.clientColumn).map((f) => f.key)
    );

    const out = { ...(originalFormData || {}) };

    Object.entries(values).forEach(([key, value]) => {
        if (clientKeys.has(key)) return;

        // don't write empty keys that were never in the submission —
        // keeps form_data clean and keeps the PDF's "-" behaviour
        const wasPresent = Object.prototype.hasOwnProperty.call(originalFormData || {}, key);
        if (isEmptyValue(value) && !wasPresent) return;

        out[key] = value;
    });

    return out;
}

export function countUnanswered(sections, values) {
    return answerableFields(sections).filter((f) => isEmptyValue(values[f.key])).length;
}