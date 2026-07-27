import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";

export default function TransferModal({
  open,
  onClose,
  transferModal,
  branches,
  selectedTransferBranch,
  setSelectedTransferBranch,
  handleTransfer,
  transferLoading,
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Transfer #{transferModal?.id}
      </DialogTitle>

      <DialogContent>
        <FormControl fullWidth>
          <InputLabel>Branch</InputLabel>

          <Select
            value={selectedTransferBranch}
            onChange={(e) =>
              setSelectedTransferBranch(e.target.value)
            }
          >
            {branches.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          fullWidth
          sx={{ mt: 2 }}
          variant="contained"
          onClick={handleTransfer}
          disabled={transferLoading}
        >
          {transferLoading ? (
            <CircularProgress size={20} />
          ) : (
            "Transfer"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}