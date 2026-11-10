/*
  Thin re-export so ClientIdGate.jsx and SingleFormPage.js keep working
  without changing their imports. It used to build its own axios instance
  on REACT_APP_FORM_MODULE_API_URL (localhost:5000) — unreachable from a
  patient's phone. One instance now, in Api.js.
*/
// formApi.js — add checkEmail to the export list
export {
  getFormById,
  getFormByQR,
  lookupClient,
  checkEmail,
  submitForm,
  getMyQR,
  generateQR,
} from "./Api";

export { default } from "./Api";