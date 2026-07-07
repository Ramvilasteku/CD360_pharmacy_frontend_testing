import React, { useState } from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Typography, TextField, IconButton, Tooltip, Stack,
} from "@mui/material";
import DeleteIcon        from "@mui/icons-material/Delete";
import EditIcon          from "@mui/icons-material/Edit";
import CheckIcon         from "@mui/icons-material/Check";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { COLORS } from "../Themes";
import { costInputSx, editInputSx } from "./Billconstants";

// Editable cost table. Supports per-row: delete, inline-edit (qty + amount + cost).
// Used for all three sections — consultations, medicines, tests — via props.
export default function CostTables({ rows, nameKey, onCostChange, onDelete, onEditSave, extraColumns, isMedicine }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft,    setEditDraft]    = useState({});

  const startEdit = (i, row) => {
    setEditingIndex(i);
    setEditDraft({
      cost:     row.cost,
      quantity: row.quantity,
      amount:   row.amount,
    });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditDraft({});
  };

  const saveEdit = (i) => {
    onEditSave(i, editDraft);
    setEditingIndex(null);
    setEditDraft({});
  };

  if (rows.length === 0) {
    return (
      <Typography fontSize={13} color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
        No items added yet.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "#f0f4f8" }}>
          <TableCell><strong>Item</strong></TableCell>
          {extraColumns?.map((col, i) => (
            <TableCell key={i} align="center"><strong>{col.label}</strong></TableCell>
          ))}
          <TableCell align="right"><strong>Cost (₹)</strong></TableCell>
          <TableCell align="center" sx={{ width: 80 }}><strong>Actions</strong></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, i) => {
          const isEditing = editingIndex === i;
          return (
            <TableRow key={i} hover sx={{ bgcolor: isEditing ? "#fffde7" : "inherit" }}>
              {/* Item name */}
              <TableCell>
                <Typography fontSize={13}>{row[nameKey]}</Typography>
                {row.duration && (
                  <Typography variant="caption" color="text.secondary">{row.duration}</Typography>
                )}
              </TableCell>

              {/* Extra columns (qty / unit price) — editable when in edit mode */}
              {extraColumns?.map((col, j) => (
                <TableCell key={j} align="center">
                  {isEditing && isMedicine && col.label === "Qty" ? (
                    <TextField
                      type="number"
                      value={editDraft.quantity ?? ""}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        const amt = Number(editDraft.amount || 0);
                        setEditDraft(d => ({ ...d, quantity: qty, cost: qty * amt }));
                      }}
                      sx={editInputSx}
                      inputProps={{ min: 1 }}
                    />
                  ) : isEditing && isMedicine && col.label === "Unit Price" ? (
                    <TextField
                      type="number"
                      value={editDraft.amount ?? ""}
                      onChange={(e) => {
                        const amt = Number(e.target.value);
                        const qty = Number(editDraft.quantity || 1);
                        setEditDraft(d => ({ ...d, amount: amt, cost: qty * amt }));
                      }}
                      sx={editInputSx}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  ) : (
                    <Typography fontSize={13}>{col.render(row)}</Typography>
                  )}
                </TableCell>
              ))}

              {/* Cost field */}
              <TableCell align="right">
                {isEditing ? (
                  <TextField
                    type="number"
                    value={editDraft.cost ?? ""}
                    onChange={(e) => setEditDraft(d => ({ ...d, cost: Number(e.target.value) }))}
                    sx={costInputSx}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                ) : (
                  <TextField
                    type="number"
                    value={row.cost}
                    onChange={(e) => onCostChange(i, e.target.value)}
                    sx={costInputSx}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                )}
              </TableCell>

              {/* Actions */}
              <TableCell align="center">
                {isEditing ? (
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="Save">
                      <IconButton size="small" onClick={() => saveEdit(i)} sx={{ color: "green" }}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton size="small" onClick={cancelEdit} sx={{ color: "#888" }}>
                        <CloseOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="Edit row">
                      <IconButton size="small" onClick={() => startEdit(i, row)} sx={{ color: COLORS.primary }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete row">
                      <IconButton size="small" onClick={() => onDelete(i)} sx={{ color: "#e53935" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}