/*
====================================================================
FormManagement.jsx

Two views now, not three:

  "list"    -> FormsList, the created forms
  "upload"  -> TemplateSelector, for starting a new form

Preview and Edit no longer replace the page. Both open
FormWorkspaceDialog — a centered popup with a close button and an
Edit / Preview toggle in its header — so the list stays behind it and
you land back on it when you close.

Picking a template on the upload screen also returns to the list and
opens that dialog, so a new form and an existing form are edited in
exactly the same place.
====================================================================
*/

import React, { useState } from "react";

import { Box, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import TemplateSelector from "./TemplateSelector";
import FormsList from "./Formslist";
import FormWorkspaceDialog from "./FormWorkspacedialog";

import { T, shell } from "./Formtheme";

const FormManagement = () => {

    const [view, setView] = useState("list");        // "list" | "upload"

    // one piece of state drives the popup: which form, which tab
    const [workspace, setWorkspace] = useState(null);
    // { formId } for an existing form, or { seed } for a new one, plus tab

    // bumped after a save so FormsList refetches
    const [refreshKey, setRefreshKey] = useState(0);

    const openExisting = (formId, tab) =>
        setWorkspace({ formId, seed: null, tab });

    const handlePreview = (formId) => openExisting(formId, "preview");
    const handleEdit = (formId) => openExisting(formId, "edit");

    const handleUseTemplate = ({ schema, templateId, suggestedName }) => {
        setView("list");
        setWorkspace({
            formId: null,
            tab: "edit",
            seed: {
                schema,
                templateId,
                formName: suggestedName || schema?.title || "",
                formType: "registration"
            }
        });
    };

    return (
        <Box sx={{ minHeight: "100%", bgcolor: T.page, py: { xs: 2, sm: 3 } }}>

            {view === "list" && (
                <FormsList
                    refreshKey={refreshKey}
                    onCreateNew={() => setView("upload")}
                    onPreview={handlePreview}
                    onEdit={handleEdit}
                />
            )}

            {view === "upload" && (
                <Box sx={shell(false)}>
                    <Button
                        onClick={() => setView("list")}
                        startIcon={<ArrowBackIcon fontSize="small" />}
                        sx={{
                            textTransform: "none",
                            color: T.brand,
                            fontWeight: 600,
                            px: 1,
                            minWidth: 0
                        }}
                    >
                        Back to forms
                    </Button>

                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: T.ink, mt: 1, mb: 0.5 }}
                    >
                        New form
                    </Typography>
                    <Typography variant="body2" sx={{ color: T.muted, mb: 2.5 }}>
                       Pick a detected template, then adjust the fields.
                    </Typography>

                    <TemplateSelector onUseTemplate={handleUseTemplate} />
                </Box>
            )}

            {workspace && (
                <FormWorkspaceDialog
                    open
                    formId={workspace.formId}
                    seed={workspace.seed}
                    initialTab={workspace.tab}
                    close={() => setWorkspace(null)}
                    onSaved={() => setRefreshKey((k) => k + 1)}
                />
            )}
        </Box>
    );
};

export default FormManagement;