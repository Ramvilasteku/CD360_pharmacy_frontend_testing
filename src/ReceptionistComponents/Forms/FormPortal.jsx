import React,{useEffect,useState} from "react";

import {
useParams,
useNavigate
} from "react-router-dom";


import {
getFormByQR
} from "./formApi";

import "./FormPortal.css";


/*
  WHAT CHANGED:

  The old version rendered every form as a clickable card. This
  version shows a single native <select> dropdown of the admin's
  forms plus a "Continue" button, and shows the selected form's
  description (if any) below the dropdown before the patient commits.

  Styling uses FormPortal.css, matching the same card/teal look as
  DynamicForm.css so the QR-scan screen and the form itself feel like
  one product. Fully responsive: stacked/full-width on mobile, a
  centered card with an inline button on tablet/desktop.
*/

const FormPortal=()=>{


const {token}=useParams();

const navigate=useNavigate();


const [formsData,setFormsData]=useState(null);


const [loading,setLoading]=useState(true);


const [error,setError]=useState(null);


const [selectedFormId,setSelectedFormId]=useState("");



useEffect(()=>{


loadForms();


},[]);



const loadForms=async()=>{


try{


const res=await getFormByQR(token);


setFormsData(res.data);


// Pre-select the first form by default so the dropdown never
// starts empty when there's at least one form available.
if(res.data?.forms?.length > 0){

  setSelectedFormId(String(res.data.forms[0].id));

}


}
catch(err){

console.log(err);

setError(
  err.response?.data?.message ||
  err.message ||
  "Unknown error"
);

}

finally{

setLoading(false);

}


};


const handleContinue=()=>{

if(!selectedFormId) return;

navigate(`/forms/${token}/${formsData.admin_id}/${selectedFormId}`);

};



if(loading)
return <div className="fp-state"><h2>Loading...</h2></div>;


if(error)
return <div className="fp-state"><h2>{error}</h2></div>;


if(!formsData || !formsData.forms || formsData.forms.length===0)
return <div className="fp-state"><h2>No forms available</h2></div>;



const selectedForm = formsData.forms.find(
  f => String(f.id) === String(selectedFormId)
);



return(

<div className="fp-page">
<div className="fp-card">


<div className="fp-header">
  <h2>Welcome</h2>
  <p>Please select the form you'd like to fill out</p>
</div>


<div className="fp-body">

<span className="fp-label">Available Forms</span>


<div className="fp-select-wrap">
  <select
    className="fp-select"
    value={selectedFormId}
    onChange={(e)=>setSelectedFormId(e.target.value)}
  >
    {
      formsData.forms.map((form)=>(
        <option key={form.id} value={form.id}>
          {form.form_name}
        </option>
      ))
    }
  </select>
</div>


{
  selectedForm?.description &&
  <p className="fp-description">{selectedForm.description}</p>
}


<button
  className="fp-continue-btn"
  onClick={handleContinue}
  disabled={!selectedFormId}
>
  Continue
</button>


</div>


</div>
</div>

);


};


export default FormPortal;