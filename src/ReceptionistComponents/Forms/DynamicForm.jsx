import React,{
useState,useRef,useEffect
} from "react";
import ClientPrefill from "./ClientPrefill";

import {
submitForm,
checkEmail
}
from "./formApi";

import "./DynamicForm.css";


/*
  WHAT CHANGED (this pass):

  1. DOCTOR MODE. `showDoctorFields` renders the fields marked
     doctorOnly in the schema instead of dropping them. Off by default,
     so the patient-facing QR flow is unchanged. SingleFormPage turns it
     on from ?scope=doctor.

     This is what makes "Additional Clinic Forms" usable: 16 of its 18
     fields are doctorOnly (Norwood staging, session tracker, treatment
     plan, billing), so a patient correctly sees only the photography
     consent, and a clinician opening the same form now sees all of it.

     SECURITY: this is a VIEW switch, not access control. The QR page is
     public, so anyone who types ?scope=doctor sees the clinician fields.
     It is fine for a clinic tablet on the desk; it is not a permission
     system. See the note in SingleFormPage.jsx.

  2. TABLE FIELDS NOW WORK. type:"table" used to render a placeholder
     saying it wasn't supported — which meant the session tracker and
     the treatment plan grid could not be filled in by anyone. There is
     now a real editor: add rows, remove rows, one input per column.
     Stored as an array of row objects, e.g.
       [{ "Date": "2026-07-31", "Session #": "3" }]

  3. Identity fields are recognised by a CANONICAL name, matching the
     server. An exact match meant a field named "Full Name" was not
     recognised as already-known, so it appeared in ClientPrefill at the
     top AND was asked again below.
*/

// Field types that should always span the full row width, even in
// the 2-column grid — anything with potentially long content or a
// list of options.
const FULL_WIDTH_TYPES = [
  "textarea",
  "paragraph",
  "radio",
  "checkbox",
  "yes_no",
  "table",
  "image",
  "file"
];


/*
  Images referenced by a schema are served by the Node app
  (app.use("/Images", express.static(...))), NOT by the React dev
  server. A patient opens this page on their phone, so a bare
  "/Images/x.png" would resolve against localhost:3000 and 404.

  Derive the host from the same env var Api.js uses, dropping the
  trailing /api.
*/
const ASSET_BASE = String(process.env.REACT_APP_QR_API_URL || "")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const resolveAssetUrl = (src) => {
  const s = String(src || "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  return `${ASSET_BASE}${s.startsWith("/") ? "" : "/"}${s}`;
};


const canon = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/*
  Field names that live in the `clients` table. Once the Client ID gate
  has resolved a patient these are shown read-only by ClientPrefill
  instead of being asked again.

  Stored canonical — compare with isClientField(), never directly.
  Keep in sync with CLIENT_FIELD_ALIASES in form.controller.js.
*/
const CLIENT_FIELD_KEYS = new Set([
  "name","fullname","clientname","patientname","participantname","firstname",
  "patientfullname","nameofpatient",
  "email","emailaddress","emailid","mail","mailid",
  "mobile","contactnumber","phone","phonenumber","mobilenumber","phonemobile",
  "mobileno","phoneno","contactno","contact","cell","cellnumber","whatsappnumber",
  "address","clientaddress","homeaddress","residentialaddress",
  "gender","sex",
  "dob","dateofbirth","birthdate",
  "bloodgroup","bloodtype",
  "password"
]);

const isClientField = (name) => CLIENT_FIELD_KEYS.has(canon(name));

// Which of those fields is the email — the one the live check watches.
const EMAIL_FIELD_KEYS = new Set([
  "email","emailaddress","emailid","mail","mailid"
]);

const isEmailField = (name) => EMAIL_FIELD_KEYS.has(canon(name));


/*
  `client` and `qrToken` are passed in by SingleFormPage:
    - registration  -> client is null, the patient fills everything
    - anything else -> the Client ID gate resolved the client first
*/
const DynamicForm=({
  form,
  client=null,
  qrToken=null,
  showDoctorFields=false,
  onSubmitted
}) => {


const [data,setData]=useState({});

const [submitting,setSubmitting]=useState(false);

/*
  LIVE EMAIL CHECK (registration forms only)

  status: null = not checked, "checking", "free", "taken", "invalid"

  The patient learns the address is already registered while they are
  still looking at the email box, instead of after filling three pages
  and pressing Submit. The server refuses the duplicate either way —
  this is only about when the patient finds out.
*/
const [emailStatus,setEmailStatus]=useState(null);
const [emailMessage,setEmailMessage]=useState("");

const emailTimer = useRef(null);
const emailSeq = useRef(0);


const runEmailCheck=(value)=>{

const email = String(value || "").trim();

if(!email){
  setEmailStatus(null);
  setEmailMessage("");
  return;
}

setEmailStatus("checking");
setEmailMessage("");

// Ignore a slow reply that lands after a newer keystroke's reply.
const seq = ++emailSeq.current;

checkEmail(qrToken, email)
  .then((res)=>{

    if(seq !== emailSeq.current) return;

    const { available, reason, message } = res.data || {};

    if(available === false){
      setEmailStatus(reason === "invalid" ? "invalid" : "taken");
      setEmailMessage(message || "");
    } else if(available === true){
      setEmailStatus("free");
      setEmailMessage("");
    } else {
      setEmailStatus(null);
      setEmailMessage("");
    }

  })
  .catch(()=>{
    // Never block typing on a failed check — submit is the real gate.
    if(seq !== emailSeq.current) return;
    setEmailStatus(null);
    setEmailMessage("");
  });

};


// Simple fields: text, number, date, textarea, select, radio, yes_no, signature
const handleChange=(e)=>{


const {

name,

value

}=e.target;



setData(prev=>({

...prev,

[name]: value

}));


/*
  Only on a registration form: `client` is null there, and it is the
  only form that creates a clients row. On other forms the email is
  already known and isn't asked.
*/
if(!client && isEmailField(name)){

  setEmailStatus(null);
  setEmailMessage("");

  clearTimeout(emailTimer.current);
  emailTimer.current = setTimeout(()=> runEmailCheck(value), 600);

}


};


// Checkbox GROUP: toggles one option in/out of an array for that field name
const handleCheckboxGroupChange=(fieldName,option,checked)=>{

setData(prev=>{

const existing = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];

const updated = checked
  ? [...existing, option]
  : existing.filter(o => o !== option);

return {
  ...prev,
  [fieldName]: updated
};

});

};


// Legacy single boolean checkbox (no options array on the field)
const handleSingleCheckboxChange=(fieldName,checked)=>{

setData(prev=>({

...prev,

[fieldName]: checked

}));

};


/*
  TABLE FIELD
  Rows are plain objects keyed by column label, so a submission reads
  back sensibly on its own without needing the schema alongside it.
*/
const tableRows = (fieldName) =>
  Array.isArray(data[fieldName]) ? data[fieldName] : [];

const handleTableChange=(fieldName,rowIdx,column,value)=>{

setData(prev=>{

const rows = (Array.isArray(prev[fieldName]) ? prev[fieldName] : [])
  .map(r => ({ ...r }));

while(rows.length <= rowIdx){
  rows.push({});
}

rows[rowIdx][column] = value;

return { ...prev, [fieldName]: rows };

});

};

const addTableRow=(fieldName)=>{

setData(prev=>({
  ...prev,
  [fieldName]: [
    ...(Array.isArray(prev[fieldName]) ? prev[fieldName] : []),
    {}
  ]
}));

};

const removeTableRow=(fieldName,rowIdx)=>{

setData(prev=>({
  ...prev,
  [fieldName]: (Array.isArray(prev[fieldName]) ? prev[fieldName] : [])
    .filter((_,i)=> i !== rowIdx)
}));

};




// Don't leave a pending check firing into an unmounted component.
useEffect(()=>()=> clearTimeout(emailTimer.current), []);


const handleSubmit=async()=>{


if(submitting) return;


// The server refuses it anyway; stopping here saves the patient a
// round trip and keeps the message next to the field it belongs to.
if(emailStatus === "taken" || emailStatus === "invalid"){
  alert(emailMessage || "Please correct the email address before submitting.");
  return;
}


try{

setSubmitting(true);


// admin_id is NOT sent — the server derives it from qr_token, so a
// patient can't file a submission into another clinic's records.
await submitForm({

qr_token: qrToken,

form_id: form.id,

client_id: client ? client.id : null,

data: data

});


alert(
"Submitted Successfully"
);


// Reset all fields so the form is blank if the same page is ever
// reused, then hand control back to the parent to redirect.
setData({});


if(onSubmitted){

  onSubmitted();

}



}
catch(err){

console.log(err);

// Show the server's real message ("missing required patient details",
// "That email is already registered", ...) instead of a bare failure.
alert(
  err.response?.data?.message || "Submission failed"
);


}
finally{

setSubmitting(false);

}



};



// Renders a single field's INPUT ONLY (label is rendered by the caller).
const renderField=(field)=>{


// Belt and braces: the section filter already removes these, but a
// doctorOnly field must never render in the patient view.
if(field.doctorOnly && !showDoctorFields){

return null;

}


switch(field.type){


case "paragraph":

  return(
    <p className="df-paragraph">
      {field.description || field.label}
    </p>
  );


case "textarea":

  return(
    <textarea
      className="df-textarea"
      name={field.name}
      placeholder={field.placeholder || ""}
      value={data[field.name] || ""}
      onChange={handleChange}
    />
  );


case "number":

  return(
    <input
      className="df-input"
      type="number"
      name={field.name}
      placeholder={field.placeholder || ""}
      value={data[field.name] || ""}
      onChange={handleChange}
    />
  );


case "date":

  return(
    <input
      className="df-input"
      type="date"
      name={field.name}
      value={data[field.name] || ""}
      onChange={handleChange}
    />
  );


case "radio":

  return(
    <div className="df-option-group">
      {
        (field.options || []).map((option,idx)=>(
          <label key={idx} className="df-option-row">
            <input
              type="radio"
              name={field.name}
              value={option}
              checked={data[field.name] === option}
              onChange={handleChange}
            />
            {option}
          </label>
        ))
      }
    </div>
  );


case "yes_no":

  return(
    <div className="df-yesno-row">
      <label className="df-option-row">
        <input
          type="radio"
          name={field.name}
          value="Yes"
          checked={data[field.name] === "Yes"}
          onChange={handleChange}
        />
        Yes
      </label>
      <label className="df-option-row">
        <input
          type="radio"
          name={field.name}
          value="No"
          checked={data[field.name] === "No"}
          onChange={handleChange}
        />
        No
      </label>
    </div>
  );


case "select":

  return(
    <select
      className="df-select"
      name={field.name}
      value={data[field.name] || ""}
      onChange={handleChange}
    >
      <option value="" disabled>Select…</option>
      {
        (field.options || []).map((option,idx)=>(
          <option key={idx} value={option}>{option}</option>
        ))
      }
    </select>
  );


case "checkbox":

  if(Array.isArray(field.options) && field.options.length > 0){

    const selected = Array.isArray(data[field.name]) ? data[field.name] : [];

    return(
      <div className="df-option-group">
        {
          field.options.map((option,idx)=>(
            <label key={idx} className="df-option-row">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(e)=>
                  handleCheckboxGroupChange(field.name,option,e.target.checked)
                }
              />
              {option}
            </label>
          ))
        }
      </div>
    );

  }

  return(
    <label className="df-option-row" style={{display:"inline-flex",width:"auto"}}>
      <input
        type="checkbox"
        checked={!!data[field.name]}
        onChange={(e)=>handleSingleCheckboxChange(field.name,e.target.checked)}
      />
      {field.label}
    </label>
  );


case "signature":

  return(
    <input
      className="df-input"
      type="text"
      name={field.name}
      placeholder="Type your full name to sign"
      value={data[field.name] || ""}
      onChange={handleChange}
    />
  );


case "file":

  return(
    <input
      className="df-input"
      type="file"
      name={field.name}
      disabled
    />
  );


/*
  IMAGE — a reference picture printed on the paper form (the
  Hamilton-Norwood chart, a Fitzpatrick table, etc). Not an input:
  nothing is collected, it is there to be looked at while answering
  the field next to it.

  `src` may be absolute ("https://...") or server-relative
  ("/Images/norwood-scale.png"), in which case it resolves against the
  API host — the QR page is opened on a phone, so it must not assume
  the file sits on the React dev server.
*/
case "image":

  return(
    <figure style={{margin:0}}>
      <img
        src={resolveAssetUrl(field.src)}
        alt={field.alt || field.label || "Reference chart"}
        style={{
          display:"block",
          width:"100%",
          maxWidth: field.maxWidth || 720,
          height:"auto",
          border:"1px solid #e2eaea",
          borderRadius:8
        }}
      />
      {field.caption && (
        <figcaption style={{color:"#7c8a8d", fontSize:12, marginTop:6}}>
          {field.caption}
        </figcaption>
      )}
    </figure>
  );


case "table": {

  const columns = Array.isArray(field.columns) ? field.columns : [];

  if(columns.length === 0){
    return(
      <p className="df-placeholder-note">
        (This table has no columns defined in the form schema.)
      </p>
    );
  }

  const rows = tableRows(field.name);

  return(
    <div>

      <div style={{overflowX:"auto"}}>
        <table
          style={{
            width:"100%",
            borderCollapse:"collapse",
            fontSize:14,
            minWidth: columns.length * 130
          }}
        >
          <thead>
            <tr>
              {columns.map((col,i)=>(
                <th
                  key={i}
                  style={{
                    textAlign:"left",
                    padding:"8px 10px",
                    background:"#1f4e4e",
                    color:"#fff",
                    fontWeight:600,
                    whiteSpace:"nowrap"
                  }}
                >
                  {col}
                </th>
              ))}
              <th style={{width:44, background:"#1f4e4e"}} />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{padding:"14px 10px", color:"#7c8a8d"}}
                >
                  No rows yet — press “Add row” to start.
                </td>
              </tr>
            )}

            {rows.map((row,rowIdx)=>(
              <tr key={rowIdx}>
                {columns.map((col,colIdx)=>(
                  <td
                    key={colIdx}
                    style={{border:"1px solid #e2eaea", padding:4}}
                  >
                    <input
                      className="df-input"
                      style={{border:"none", padding:"6px 8px"}}
                      value={row[col] || ""}
                      onChange={(e)=>
                        handleTableChange(field.name,rowIdx,col,e.target.value)
                      }
                    />
                  </td>
                ))}
                <td
                  style={{
                    border:"1px solid #e2eaea",
                    padding:4,
                    textAlign:"center"
                  }}
                >
                  <button
                    type="button"
                    onClick={()=>removeTableRow(field.name,rowIdx)}
                    title="Remove this row"
                    style={{
                      border:"none",
                      background:"transparent",
                      color:"#c0392b",
                      fontSize:18,
                      cursor:"pointer",
                      lineHeight:1
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={()=>addTableRow(field.name)}
        style={{
          marginTop:10,
          padding:"8px 16px",
          border:"1px solid #1f4e4e",
          background:"#fff",
          color:"#1f4e4e",
          borderRadius:6,
          cursor:"pointer",
          fontWeight:600
        }}
      >
        + Add row
      </button>

    </div>
  );

}


case "text":
default:

  return(
    <input
      className="df-input"
      type="text"
      name={field.name}
      placeholder={field.placeholder || ""}
      value={data[field.name] || ""}
      onChange={handleChange}
    />
  );


}


};


/*
  A field is rendered when:
    - it isn't doctorOnly, OR we're in doctor mode, AND
    - it isn't something we already know from the clients row.
*/
const shouldAsk = (field) =>
  (showDoctorFields || !field.doctorOnly) &&
  !(client && isClientField(field.name));



const sections = Array.isArray(form.sections) ? form.sections : [];

if(sections.length === 0){

return(

<div className="df-page">
  <div className="df-card">
    <div className="df-empty">
      <h2>{form.form_name || "Form"}</h2>
      <p>This form has no fields configured, or the field data is invalid.</p>
    </div>
  </div>
</div>

);

}


// Sections left with nothing to show are dropped, so a section whose
// fields are all doctorOnly doesn't render as an empty numbered heading
// on a patient's phone.
const visibleSections = sections.filter(section =>
  (section.fields || []).some(shouldAsk)
);


const hiddenSectionCount = sections.length - visibleSections.length;



return(

<div className="df-page">
<div className="df-card">


<div className="df-header">
  <h2>{form.form_name}</h2>
  {form.description && <p>{form.description}</p>}
  {showDoctorFields && (
    <p style={{marginTop:6, fontWeight:600}}>
      Clinician view — includes sections not shown to patients
    </p>
  )}
</div>


<div className="df-body">

{client && (
  <div className="df-section">
    <ClientPrefill client={client} />
  </div>
)}


{

visibleSections.length === 0 && client && (
  <div className="df-section">
    <p className="df-placeholder-note">
      Nothing further to fill in — press Submit to record this form.
    </p>
  </div>
)

}


{

visibleSections
.map((section,sectionIdx)=>(

<div key={sectionIdx} className="df-section">

<div className="df-section-header">
  <span className="df-section-badge">{sectionIdx + 1}</span>
  <h3 className="df-section-title">{section.title}</h3>
</div>

{section.description && (
  <p style={{color:"#7c8a8d", fontSize:13, marginTop:-4, marginBottom:12}}>
    {section.description}
  </p>
)}


<div className="df-field-grid">

{

(section.fields || [])

.filter(shouldAsk)

.map((field,fieldIdx)=>{

const isFullWidth =
  FULL_WIDTH_TYPES.includes(field.type) ||
  (field.type === "checkbox" && !(field.options && field.options.length));

return(

<div
  key={field.name || fieldIdx}
  className={
    isFullWidth
      ? "df-field df-field-full"
      : "df-field"
  }
>

{

field.type !== "paragraph" &&
!(field.type === "checkbox" && !(field.options && field.options.length)) &&

<span className="df-label">
  {field.label}
  {field.required && <span className="df-required">*</span>}
  {field.doctorOnly && (
    <span
      style={{
        marginLeft:8,
        fontSize:11,
        fontWeight:600,
        color:"#1f4e4e",
        background:"#e7f0f0",
        border:"1px solid #cfe0e0",
        borderRadius:4,
        padding:"1px 6px",
        verticalAlign:"middle"
      }}
    >
      DOCTOR
    </span>
  )}
</span>

}

{field.description && field.type !== "paragraph" && (
  <span style={{color:"#7c8a8d", fontSize:12, marginBottom:6}}>
    {field.description}
  </span>
)}


{renderField(field)}


{!client && isEmailField(field.name) && (
  <>
    {emailStatus === "checking" && (
      <span style={{color:"#7c8a8d", fontSize:12, marginTop:6}}>
        Checking…
      </span>
    )}
    {(emailStatus === "taken" || emailStatus === "invalid") && (
      <span style={{color:"#c0392b", fontSize:13, marginTop:6}}>
        {emailMessage}
      </span>
    )}
    {emailStatus === "free" && (
      <span style={{color:"#1f7a5a", fontSize:12, marginTop:6}}>
        ✓ Available
      </span>
    )}
  </>
)}


</div>

);

})

}


</div>


</div>

))

}

</div>


<div className="df-submit-bar">
  {!showDoctorFields && hiddenSectionCount > 0 && (
    <span style={{color:"#7c8a8d", fontSize:12, marginRight:"auto"}}>
      {hiddenSectionCount} section{hiddenSectionCount > 1 ? "s" : ""} completed by the clinic
    </span>
  )}
  <button
    className="df-submit-btn"
    onClick={handleSubmit}
    disabled={
      submitting ||
      emailStatus === "taken" ||
      emailStatus === "invalid"
    }
  >
    {submitting ? "Submitting…" : "Submit"}
  </button>
</div>


</div>
</div>


);


};


export default DynamicForm;