// src/pharmacy/transfer/PurchaseTransfer.js     (route: pharmacy/purchase-transfer — see pharmacyRoutes.jsx)
//
// Purchase transfer: send stock from one branch to another branch of the same pharmacy.
//
//   List          Incoming / Outgoing / All, status filter, search; admin can also filter by
//                 branch. In-transit transfers come first; ones waiting for YOU are marked.
//   New transfer  pick batches from your branch's stock, choose the branch to send to, send.
//                 (pharmacy.purchase_transfer.create)
//   Open one      see its medicines and progress; the receiving branch accepts or rejects it
//                 (pharmacy.purchase_transfer.edit), the sending branch can cancel it while it is
//                 still in transit (pharmacy.purchase_transfer.create).
//
// New transfer and an opened transfer replace the list on the same page, with a Back arrow —
// no pop-ups — the same way B2B sale works. The list stays mounted underneath (hidden), so its
// tab, filters and page are as you left them when you come back. The page never scrolls; only the
// rows inside do.
//
// Needs pharmacy.purchase_transfer.view.
// Backend: routes/pharmacy/pharmacyStockTransfer.js @ /api/pharmacy/stock-transfers

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Skeleton, Snackbar, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";

import { ColorRoot, cssVar, fade, toneInk } from "../../theme/appColors";
import useAccess, { AccessDenied } from "../../hooks/useAccess";
import TransferList from "./TransferList";
import NewTransfer from "./NewTransfer";
import TransferDetail from "./TransferDetail";
import { EmptyState, PERM, api, apiMessage, buttonSx, useFitsWindow } from "./transferShared";

const SHELL_HEIGHT = "calc(100dvh - var(--purchase-transfer-offset, 0px))";

function PurchaseTransferPage() {
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const { loading: accessLoading, can } = useAccess();
  const canView = can(PERM.view);
  const canCreate = can(PERM.create);
  const canEdit = can(PERM.edit);

  const [info, setInfo] = useState(null); // GET /get/branches
  const [infoError, setInfoError] = useState("");
  const [view, setView] = useState({ mode: "list" }); // list | new | detail
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState(null);

  const loadInfo = useCallback(() => {
    setInfoError("");
    return api
      .branches()
      .then(setInfo)
      .catch((e) => setInfoError(apiMessage(e, "Could not load your branches.")));
  }, []);

  useEffect(() => {
    if (!accessLoading && canView) loadInfo();
  }, [accessLoading, canView, loadInfo]);

  if (!accessLoading && !canView) {
    return (
      <Box sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what="purchase transfers" />
      </Box>
    );
  }

  const canSend = canCreate && !!info?.can_transfer;
  const backToList = () => setView({ mode: "list" });

  let body;
  if (!info && !infoError) {
    body = (
      <Stack spacing={1} sx={{ p: 2 }}>
        <Skeleton variant="rounded" height={44} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={48} />
        ))}
      </Stack>
    );
  } else if (infoError) {
    body = (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }} action={<Button color="inherit" size="small" onClick={loadInfo}>Retry</Button>}>
          {infoError}
        </Alert>
      </Box>
    );
  } else {
    body = (
      <>
        {/* the list stays mounted while a transfer is open, so it comes back as it was */}
        <Box sx={{ flex: 1, minHeight: 0, display: view.mode === "list" ? "flex" : "none", flexDirection: "column" }}>
          {/* page header */}
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 2, md: 3 },
              py: { xs: 1.25, md: 1.5 },
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em" }} noWrap>
                Purchase transfer
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", md: "block" } }} noWrap>
                {pending
                  ? `${pending} ${pending === 1 ? "transfer is" : "transfers are"} waiting to be accepted`
                  : "Send stock to another branch — it reaches their stock once they accept it"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              {info.my_branch && (
                <Box
                  sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.25,
                    py: 0.6,
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 600,
                    color: toneInk("primary"),
                    bgcolor: fade(cssVar("primary"), 0.08),
                    maxWidth: 220,
                  }}
                >
                  <StoreOutlinedIcon sx={{ fontSize: 17 }} />
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {info.my_branch}
                  </Box>
                </Box>
              )}
              {canSend && (
                <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => setView({ mode: "new" })} sx={buttonSx}>
                  New transfer
                </Button>
              )}
            </Stack>
          </Box>

          {/* why sending isn't possible (only shown to people who could otherwise send) */}
          {canCreate && !info.can_transfer && info.reason && (info.is_admin || info.my_branch) && (
            <Alert severity="info" sx={{ flexShrink: 0, borderRadius: 0 }}>
              {info.reason}
            </Alert>
          )}
          {info.is_admin && info.batches_without_branch > 0 && (
            <Alert severity="warning" sx={{ flexShrink: 0, borderRadius: 0 }}>
              {info.batches_without_branch} {info.batches_without_branch === 1 ? "stock batch has" : "stock batches have"} no branch yet, so{" "}
              {info.batches_without_branch === 1 ? "it" : "they"} can’t be transferred or sold by branch. Ask support to assign{" "}
              {info.batches_without_branch === 1 ? "it" : "them"} to a branch.
            </Alert>
          )}

          {info.is_admin || info.my_branch ? (
            <TransferList
              info={info}
              reloadKey={reloadKey}
              canSend={canSend}
              onNew={() => setView({ mode: "new" })}
              onOpen={(ref) => setView({ mode: "detail", ref })}
              onPendingChange={setPending}
            />
          ) : (
            <EmptyState icon={<StoreOutlinedIcon />} title="Your profile has no branch">
              Transfers are sent and received by branch. Ask your admin to set your branch, then open this page again.
            </EmptyState>
          )}
        </Box>

        {view.mode === "new" && (
          <NewTransfer
            info={info}
            onBack={backToList}
            onSent={(transfer, message) => {
              setReloadKey((k) => k + 1);
              setToast(message || `${transfer.transfer_number} sent`);
              setView({ mode: "detail", ref: transfer.transfer_number });
            }}
          />
        )}
        {view.mode === "detail" && (
          <TransferDetail
            key={view.ref}
            transferNumber={view.ref}
            permAccept={canEdit}
            permCancel={canCreate}
            onBack={backToList}
            onChanged={(message) => {
              setReloadKey((k) => k + 1);
              if (message) setToast(message);
            }}
          />
        )}
      </>
    );
  }

  return (
    <Box
      ref={shellRef}
      sx={{
        height: shellHeight,
        maxHeight: "86vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {body}

      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function PurchaseTransfer() {
  return (
    <ColorRoot>
      <PurchaseTransferPage />
    </ColorRoot>
  );
}