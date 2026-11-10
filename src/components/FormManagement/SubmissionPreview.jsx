/*
====================================================================
SubmissionPreview.jsx   —   the VIEW dialog (eye icon)

Read-only. Shows the submission exactly as the PDF will look, because
it renders the very same HTML the PDF is generated from: the backend
route GET /submissions/:id/preview returns the output of
buildSubmissionHtml(), which is what Chromium then prints.

That is the whole point of doing it this way — there is no second
renderer to keep in sync. If the preview looks right, the PDF is right.

No Edit button lives in here. Editing is a separate dialog
(SubmissionEditForm.jsx) opened by its own pencil icon, so viewing
can never accidentally become editing.

    <SubmissionPreview id={id} open close={() => setViewId(null)} />
====================================================================
*/

import React, { useEffect, useState } from "react";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Stack,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    Alert
} from "@mui/material";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import {
    getSubmissionPreviewHtml,
    downloadSubmissionPDF
} from "./formManagementApi";

/* The PDF markup has no page margins of its own — Chromium adds them
   at print time. Inject them here so the on-screen preview is spaced
   like the printed page. */
const SCREEN_STYLE = `
<style>
  body { max-width: 780px; margin: 0 auto; padding: 24px 26px 40px; background: #fff; }
  section.page, section.section { break-after: auto; }
</style>`;

function withScreenStyle(html) {
    if (!html) return "";
    return html.includes("</head>")
        ? html.replace("</head>", `${SCREEN_STYLE}</head>`)
        : SCREEN_STYLE + html;
}

const SubmissionPreview = ({ id, open, close }) => {

    const [html, setHtml] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scope, setScope] = useState("full");

    useEffect(() => {
        if (!open || !id) {
            setHtml("");
            setError(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const markup = await getSubmissionPreviewHtml(id, { scope });

                if (!cancelled) setHtml(markup);

            } catch (err) {
                console.log("Submission Preview Error:", err);
                if (!cancelled) setError("Could not load this submission.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, open, scope]);

    return (
        <Dialog open={open} onClose={close} fullWidth maxWidth="md">

            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        Submitted form
                        <Typography variant="body2" color="text.secondary">
                            Exactly as it will print
                        </Typography>
                    </Box>

                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={scope}
                        onChange={(e, next) => next && setScope(next)}
                    >
                        <ToggleButton value="full">Full record</ToggleButton>
                        <ToggleButton value="patient">Patient copy</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, bgcolor: "grey.100" }}>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={6}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ m: 2 }}>
                        {error}
                    </Alert>
                ) : (
                    <Box
                        component="iframe"
                        title="Submission preview"
                        srcDoc={withScreenStyle(html)}
                        sandbox=""
                        sx={{
                            width: "100%",
                            height: "70vh",
                            border: 0,
                            display: "block",
                            bgcolor: "#fff"
                        }}
                    />
                )}

            </DialogContent>

            <DialogActions>
                <Button onClick={close}>Close</Button>
                <Button
                    variant="contained"
                    startIcon={<PictureAsPdfIcon />}
                    disabled={loading || Boolean(error)}
                    onClick={() => downloadSubmissionPDF(id, { scope })}
                >
                    Download PDF
                </Button>
            </DialogActions>

        </Dialog>
    );
};

export default SubmissionPreview;