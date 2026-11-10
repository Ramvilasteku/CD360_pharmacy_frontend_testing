import axios from "axios";


const API_URL =
process.env.REACT_APP_FORM_MODULE_API_URL;


// GET ALL SUBMISSIONS

export const getSubmissions = async()=>{


    const response = await axios.get(

        `${API_URL}/form-management/submissions`,

        {
            withCredentials:true
        }

    );


    return response.data;

};


// UPDATE SUBMISSION

export const updateSubmission = async (id, payload) => {

    const response = await axios.put(

        `${API_URL}/form-management/submissions/${id}`,

        payload,

        {
            withCredentials:true
        }

    );

    return response.data;

};



// GET SINGLE SUBMISSION

export const getSubmissionById = async(id)=>{


    const response = await axios.get(

        `${API_URL}/form-management/submissions/${id}`,

        {
            withCredentials:true
        }

    );


    return response.data;

};



// DELETE SUBMISSION

export const deleteSubmission = async(id)=>{


    const response = await axios.delete(

        `${API_URL}/form-management/submissions/${id}`,

        {
            withCredentials:true
        }

    );


    return response.data;

};



// GET SUBMISSION PREVIEW (HTML)
//
// Returns the same markup the PDF is printed from, so the view dialog
// and the PDF can never disagree. No Chromium process is started for
// this, which is why it is fast enough to open on every click.
//
// scope: "full" (default, whole clinical record) | "patient" (hides
// every field marked doctorOnly in formSchemas.js)

export const getSubmissionPreviewHtml = async(id, { scope } = {})=>{


    const response = await axios.get(

        `${API_URL}/form-management/submissions/${id}/preview`,

        {
            withCredentials:true,
            params: scope === "patient" ? { scope: "patient" } : undefined,
            responseType:"text"
        }

    );


    return response.data;

};



// DOWNLOAD PDF
//
// downloadSubmissionPDF(id)                      -> full record
// downloadSubmissionPDF(id, { scope:"patient" }) -> patient copy
// downloadSubmissionPDF(id, { inline:true })     -> opens in a new tab

export const downloadSubmissionPDF = async(id, { scope, inline } = {})=>{


    const params = {};

    if(scope === "patient") params.scope = "patient";

    if(inline) params.inline = 1;


    const response = await axios.get(

        `${API_URL}/form-management/submissions/${id}/pdf`,

        {
            withCredentials:true,
            responseType:"blob",
            params
        }

    );


    const fileURL =
    window.URL.createObjectURL(
        new Blob([response.data], { type:"application/pdf" })
    );


    if(inline){

        window.open(fileURL, "_blank");

        // give the new tab time to read the blob before revoking
        setTimeout(()=>window.URL.revokeObjectURL(fileURL), 60000);

        return;

    }


    const link =
    document.createElement("a");


    link.href=fileURL;


    link.download=
    scope === "patient"
    ? `submission_${id}_patient_copy.pdf`
    : `submission_${id}.pdf`;


    document.body.appendChild(link);


    link.click();


    link.remove();


    // the anchor click is synchronous, so the blob can go now
    window.URL.revokeObjectURL(fileURL);

};