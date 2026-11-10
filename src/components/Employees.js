import Button from "@mui/material/Button";
import React, { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { DataGrid } from "@mui/x-data-grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, TextField, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import AssignRoleDialog from "./AssignRoleDialog";
import RoleWizard from "./RoleModule/RoleWizard";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  border: "0px solid #000",
  borderRadius: "20px",
  boxShadow: 24,
  p: 4,
};

const roleModalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 450,
  bgcolor: "background.paper",
  borderRadius: "16px",
  boxShadow: 24,
  p: 4,
};

// Adds scroll to any Select dropdown
const scrollMenuProps = {
  PaperProps: { style: { maxHeight: 200 } },
};

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = React.useState(false);
  const [singleopen, setSingleopen] = React.useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
    status: 1,
    qualification: "",
    date_of_joining: "",
    role: "",
    branch: "",
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // Dynamic roles
  const [roles, setRoles] = useState([]);

  // Create-role modal state
  // Role Wizard (opens when "+ Create New Role" is clicked)
  const [roleWizardOpen, setRoleWizardOpen] = useState(false);
  const [roleWizardContext, setRoleWizardContext] = useState("add"); // "add" | "edit"

  // Assign-Role dialog state
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [assignRoleEmployee, setAssignRoleEmployee] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const updateProfilePhoto = async () => {
    if (!photoFile || !selectedEmployee?.id) return;
    const formData = new FormData();
    formData.append("profile_photo", photoFile);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_URL}/api/staff/update/${selectedEmployee.id}`,
        { method: "PUT", credentials: "include", body: formData },
      );
      const data = await res.json();
      if (data.success) {
        alert("Profile photo updated");
        setPreviewImage(null);
        setSelectedEmployee((prev) => ({
          ...prev,
          profile_photo: data.profile_photo,
        }));
        window.location.reload();
      }
    } catch (err) {
      console.error("Photo update error", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setSelectedEmployee((prev) => ({
      ...prev,
      [name]: name === "status" ? Number(value) : value,
    }));
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleeditOpen = () => setSingleopen(true);
  const handleeditClose = () => setSingleopen(false);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_URL}/api/roles/getall/roles`,
        { credentials: "include" },
      );
      const data = await res.json();
      const assignable = (data?.data || []).filter(
        (r) => r.role_key !== "admin" && r.role_key !== "client",
      );
      setRoles(assignable);
      return assignable;
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      return [];
    }
  };
  // Role Select change handler (intercepts "+ Create New Role")
  const handleRoleSelectChange = (e, isEdit = false) => {
    const value = e.target.value;
    if (value === "__create_new__") {
      setRoleWizardContext(isEdit ? "edit" : "add");
      setRoleWizardOpen(true);
      return;
    }
    if (isEdit) {
      setSelectedEmployee((prev) => ({ ...prev, role: value }));
    } else {
      setFormData((prev) => ({ ...prev, role: value }));
    }
  };

  // After the wizard saves, refresh roles and auto-select the newly created one
  const handleWizardSaved = async (created) => {
    const prevIds = new Set(roles.map((r) => r.id));
    const fresh = await fetchRoles();
    setRoleWizardOpen(false);
    if (created) {
      const newRole = fresh.find((r) => !prevIds.has(r.id));
      if (newRole) {
        if (roleWizardContext === "edit") {
          setSelectedEmployee((prev) => ({ ...prev, role: newRole.role_key }));
        } else {
          setFormData((prev) => ({ ...prev, role: newRole.role_key }));
        }
      }
    }
  };

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      renderCell: (params) => (
        <Button
          variant="text"
          size="small"
          sx={{ textTransform: "none" }}
          onClick={() => handleIdClick(params.value)}
        >
          {params.row.id}
        </Button>
      ),
    },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "role", headerName: "Role", flex: 1 },
    { field: "mobile", headerName: "Mobile", width: 140 },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <span
          style={{
            color: params.value === 1 ? "green" : "red",
            fontWeight: 600,
          }}
        >
          {params.value === 1 ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Manage roles">
            <IconButton
              sx={{ color: "#3f6f7a" }}
              onClick={() => {
                setAssignRoleEmployee(params.row);
                setAssignRoleOpen(true);
              }}
            >
              <ManageAccountsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const filteredRows = employees.filter((row) =>
    Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  // ✅ Create employee — writes primary to staff table + user_role_assignments
  const submitEmployee = async () => {
    try {
      // 1) Create staff record (primary role goes to staff.role)
      const response = await fetch(
        `${process.env.REACT_APP_URL}/api/staff/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to submit");
      }

      // 2) Mirror the primary role into user_role_assignments
      const newStaffId = result?.data?.id || result?.id || result?.insertId;
      const chosenRole = roles.find((r) => r.role_key === formData.role);

      if (newStaffId && chosenRole) {
        try {
          await fetch(
            `${process.env.REACT_APP_URL}/api/user-role-assignments/post/user-role-assignments`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                user_id: newStaffId,
                user_type: "staff",
                role_id: chosenRole.id,
                is_primary: true,
              }),
            },
          );
        } catch (mirrorErr) {
          // Non-fatal — admin can fix from "Manage roles" if this fails
          console.warn("Assignment mirror failed:", mirrorErr);
        }
      }

      setFormData({
        name: "",
        email: "",
        password: "",
        mobile: "",
        address: "",
        status: 1,
        qualification: "",
        date_of_joining: "",
        role: "",
        branch: "",
      });
      Employeedetails();
      handleClose();
      alert("Employee added successfully!");
    } catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
    }
  };

  const Employeedetails = async () => {
    try {
      const response = await fetch(process.env.REACT_APP_EMPLOYEE_FETCH, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch employee details");
      const data = await response.json();
      setEmployees(data.data);
      return data;
    } catch (error) {
      console.error("Error fetching employees:", error.message);
    }
  };

  useEffect(() => {
    Employeedetails();
    fetchRoles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;
    try {
      const response = await fetch(
        `${process.env.REACT_APP_EMPLOYEE_DELETE}/${id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to delete employee");
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  };

  const handleIdClick = async (id) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SINGLEEMPLOYEE_FETCH}/${id}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      const result = await response.json();
      if (!response.ok) alert("some error Occured");
      setSelectedEmployee(result.data);
      handleeditOpen();
    } catch (error) {
      alert(error);
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL}/api/staff/update/${selectedEmployee.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: selectedEmployee.name,
            email: selectedEmployee.email,
            mobile: selectedEmployee.mobile,
            address: selectedEmployee.address,
            status: selectedEmployee.status,
            date_of_joining: selectedEmployee.date_of_joining,
            role: selectedEmployee.role,
            qualification: selectedEmployee.qualification,
            branch: selectedEmployee.branch,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Update failed");
      alert("Employee updated successfully");
      handleeditClose();
      Employeedetails();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <div className="container-fluid" style={{ marginTop: "10px" }}>
        <div className="row">
          <div className="col-12 text-end">
            <Button
              variant="contained"
              onClick={handleOpen}
              sx={{
                textTransform: "none",
                background: "linear-gradient(180deg, #3f6f7a, #5f9aa6)",
              }}
            >
              <AddIcon /> Add Employee
            </Button>
          </div>

          <Box
            sx={{
              width: "100%",
              height: { xs: 400, sm: 500, md: 441 },
              overflowX: "auto",
              mt: 2,
            }}
          >
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={(row) => row.id}
              initialState={{
                pagination: { paginationModel: { pageSize: 6, page: 0 } },
              }}
              sx={{
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#3f6f7a",
                  fontWeight: 600,
                },
              }}
              disableRowSelectionOnClick
            />
          </Box>

          {/* Add Employee Modal */}
          <Modal open={open} onClose={handleClose}>
            <Box sx={style}>
              <Typography
                sx={{
                  textAlign: "center",
                  color: "#3f6f7a",
                  fontWeight: 600,
                }}
                variant="h6"
              >
                Add the Employee
              </Typography>
              <IconButton
                onClick={handleClose}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  color: "#6b7280",
                }}
              >
                <CloseIcon />
              </IconButton>
              <br />
              <div className="d-flex justify-content-between">
                <div>
                  <TextField
                    type="text"
                    name="name"
                    variant="standard"
                    value={formData.name}
                    onChange={handleChange}
                    label="Name"
                    required
                  />
                  <br />
                  <br />
                  <TextField
                    type="password"
                    name="password"
                    variant="standard"
                    value={formData.password}
                    onChange={handleChange}
                    label="Password"
                    required
                  />
                  <br />
                  <br />
                  <TextField
                    type="text"
                    variant="standard"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    label="Qualification"
                    required
                  />
                  <br />
                  <br />

                  {/* DYNAMIC ROLE DROPDOWN — Add form */}
                  <FormControl variant="standard" sx={{ m: 1, minWidth: 180 }}>
                    <InputLabel id="add-role-label">Role</InputLabel>
                    <Select
                      labelId="add-role-label"
                      name="role"
                      label="Role"
                      value={formData.role}
                      onChange={(e) => handleRoleSelectChange(e, false)}
                      required
                      MenuProps={scrollMenuProps}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={r.role_key}>
                          {r.role_name}
                        </MenuItem>
                      ))}
                      <MenuItem
                        value="__create_new__"
                        sx={{
                          color: "#3f6f7a",
                          fontWeight: 600,
                          borderTop: "1px solid #eee",
                          mt: 0.5,
                        }}
                      >
                        + Create New Role
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <br />
                  <br />
                  <TextField
                    type="text"
                    variant="outlined"
                    name="address"
                    label="Address"
                    value={formData.address}
                    onChange={handleChange}
                    multiline
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <TextField
                    type="email"
                    variant="standard"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    label="Email"
                    required
                  />
                  <br />
                  <br />
                  <TextField
                    type="number"
                    variant="standard"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    label="Mobile"
                    required
                  />
                  <br />
                  <br />
                  <TextField
                    type="text"
                    variant="standard"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    label="Branch"
                    required
                  />
                  <br />
                  <br />
                  <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                    <InputLabel id="add-status-label">Status</InputLabel>
                    <Select
                      labelId="add-status-label"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      required
                    >
                      <MenuItem value={1}>Active</MenuItem>
                      <MenuItem value={0}>Inactive</MenuItem>
                    </Select>
                  </FormControl>
                  <br />
                  <br />
                  <TextField
                    type="date"
                    name="date_of_joining"
                    variant="standard"
                    value={formData.date_of_joining}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    label="DateofJoining"
                    required
                  />
                </div>
              </div>
              <div className="col-12 pt-2 text-center">
                <Button
                  variant="contained"
                  onClick={submitEmployee}
                  sx={{ textTransform: "none", backgroundColor: "#3f6f7a" }}
                >
                  Submit
                </Button>
              </div>
            </Box>
          </Modal>

          {/* Edit Employee Modal */}
          <Modal open={singleopen} onClose={handleeditClose}>
            <Box sx={style}>
              <div className="col-12 text-start">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  id="profilePhotoInput"
                  onChange={handlePhotoChange}
                />
                <img
                  src={
                    selectedEmployee?.profile_photo
                      ? `${process.env.REACT_APP_URL}/Images/${selectedEmployee?.profile_photo}`
                      : `${process.env.REACT_APP_URL}/Images/profile.jpg`
                  }
                  alt="Profile"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    cursor: "pointer",
                    border: "2px solid #3f6f7a",
                  }}
                  onClick={() =>
                    document.getElementById("profilePhotoInput").click()
                  }
                />
                <br />
                <Button
                  variant="contained"
                  sx={{
                    mt: 2,
                    textTransform: "none",
                    backgroundColor: "#3f6f7a",
                  }}
                  disabled={!photoFile}
                  onClick={updateProfilePhoto}
                >
                  Update Photo
                </Button>
              </div>

              <div className="d-flex justify-content-between pt-3">
                <div>
                  <TextField
                    variant="standard"
                    name="name"
                    label="Name"
                    onChange={handleEditChange}
                    value={selectedEmployee?.name || " "}
                  />
                  <br />
                  <br />
                  <TextField
                    variant="standard"
                    name="email"
                    label="Email"
                    onChange={handleEditChange}
                    value={selectedEmployee?.email || " "}
                  />
                  <br />
                  <br />
                  <TextField
                    variant="standard"
                    name="mobile"
                    label="Mobile"
                    onChange={handleEditChange}
                    value={selectedEmployee?.mobile || " "}
                  />
                  <br />
                  <br />
                  <FormControl variant="standard" fullWidth>
                    <InputLabel id="edit-status-label">Status</InputLabel>
                    <Select
                      labelId="edit-status-label"
                      name="status"
                      value={selectedEmployee?.status ?? ""}
                      onChange={handleEditChange}
                    >
                      <MenuItem value={1}>Active</MenuItem>
                      <MenuItem value={0}>Inactive</MenuItem>
                    </Select>
                  </FormControl>
                  <br />
                  <br />

                  {/* DYNAMIC ROLE DROPDOWN — Edit form */}
                  <FormControl variant="standard" fullWidth>
                    <InputLabel id="edit-role-label">Role</InputLabel>
                    <Select
                      labelId="edit-role-label"
                      name="role"
                      value={selectedEmployee?.role ?? ""}
                      onChange={(e) => handleRoleSelectChange(e, true)}
                      MenuProps={scrollMenuProps}
                    >
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={r.role_key}>
                          {r.role_name}
                        </MenuItem>
                      ))}
                      <MenuItem
                        value="__create_new__"
                        sx={{
                          color: "#3f6f7a",
                          fontWeight: 600,
                          borderTop: "1px solid #eee",
                          mt: 0.5,
                          position: "fixed",
                        }}
                      >
                        + Create New Role
                      </MenuItem>
                    </Select>
                  </FormControl>
                </div>
                <div>
                  <TextField
                    variant="standard"
                    name="address"
                    label="Address"
                    onChange={handleEditChange}
                    value={selectedEmployee?.address || " "}
                    multiline
                    rows={3}
                  />
                  <br />
                  <br />
                  <TextField
                    variant="standard"
                    name="branch"
                    label="Branch"
                    onChange={handleEditChange}
                    value={selectedEmployee?.branch || " "}
                  />
                  <br />
                  <br />
                  <TextField
                    variant="standard"
                    name="date_of_joining"
                    label="Date of Joining"
                    onChange={handleEditChange}
                    value={
                      selectedEmployee?.date_of_joining
                        ? selectedEmployee.date_of_joining.split("T")[0]
                        : ""
                    }
                  />
                  <br />
                  <br />
                  <TextField
                    variant="standard"
                    name="qualification"
                    label="Qualification"
                    onChange={handleEditChange}
                    value={selectedEmployee?.qualification || " "}
                  />
                </div>
              </div>
              <div className="col-12 text-end">
                <Button
                  variant="outlined"
                  sx={{
                    textTransform: "none",
                    color: "#3f6f7a",
                    borderColor: "#3f6f7a",
                  }}
                  onClick={handleeditClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpdate}
                  sx={{
                    textTransform: "none",
                    marginLeft: "10px",
                    backgroundColor: "#3f6f7a",
                  }}
                >
                  Update
                </Button>
              </div>
            </Box>
          </Modal>

          {/* Role Wizard — opens on "+ Create New Role" */}
          <RoleWizard
            open={roleWizardOpen}
            onClose={() => setRoleWizardOpen(false)}
            role={null}
            onSaved={handleWizardSaved}
          />

          {/* Manage Roles dialog */}
          <AssignRoleDialog
            open={assignRoleOpen}
            onClose={() => setAssignRoleOpen(false)}
            employee={assignRoleEmployee}
            allRoles={roles}
            onChanged={Employeedetails}
          />
        </div>
      </div>
    </>
  );
};

export default Employees;
