import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Grid,
  Stack,
  CircularProgress,
} from "@mui/material";

export default function IpdAdmissionForm({
  open,
  onClose,
  form,
  setForm,
  handleSubmit,
  submitLoading,
  editId,
}) {
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>
        {editId ? "Edit Admission" : "Create Admission"}
      </DialogTitle>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12}>
              <TextField
                name="admission_reason"
                label="Admission Reason"
                fullWidth
                value={form.admission_reason || ""}
                onChange={handleChange} 
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="admission_date"
                type="datetime-local"
                fullWidth
                value={form.admission_date || ""}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} mt={3}>
            <Button onClick={onClose}>Cancel</Button>

            <Button type="submit" variant="contained">
              {submitLoading ? (
                <CircularProgress size={20} />
              ) : editId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}