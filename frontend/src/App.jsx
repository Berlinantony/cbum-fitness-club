
import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");
const API_URL = `${API_BASE_URL}/api/auth`;
const MEMBERSHIP_API_URL = `${API_BASE_URL}/api/membership`;
const PAYMENTS_API_URL = `${API_BASE_URL}/api/payments`;

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  if (!contentType.includes("application/json")) {
    if (response.status === 404) {
      throw new Error(
        "API endpoint not found (404). Check the Vercel backend service routing and redeploy."
      );
    }

    throw new Error(
      `The server returned a non-JSON response (HTTP ${response.status}).`
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      `The server returned invalid JSON (HTTP ${response.status}).`
    );
  }
}

const plans = [
  {
    name: "MONTHLY",
    duration: "1 Month",
    price: "₹1,500",
    description: "Perfect for getting started.",
    features: [
      "Full gym access",
      "Strength training equipment",
      "Locker room access",
    ],
  },
  {
    name: "QUARTERLY",
    duration: "3 Months",
    price: "₹4,000",
    description: "Build consistency and strength.",
    features: [
      "Everything in Monthly",
      "Personal fitness guidance",
      "Priority gym access",
    ],
    featured: true,
  },
  {
    name: "YEARLY",
    duration: "12 Months",
    price: "₹14,000",
    description: "Commit to your long-term goals.",
    features: [
      "Everything in Quarterly",
      "Long-term fitness support",
      "Membership renewal option",
    ],
  },
];

function AdminDashboard({ user, onLogout, onHome }) {
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const token = localStorage.getItem("cbToken");
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("MONTHLY");
  const [assigningMembership, setAssigningMembership] = useState(false);
  const [membershipMessage, setMembershipMessage] = useState("");
  const [membershipError, setMembershipError] = useState("");

  // Payment management states
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [paymentMemberId, setPaymentMemberId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [paymentPlan, setPaymentPlan] = useState("MONTHLY");

  const totalRevenue = payments
    .filter((payment) => payment.paymentStatus === "Paid")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const pendingPayments = payments
    .filter((payment) => payment.paymentStatus === "Pending")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const activeMembers = (memberData?.members || []).filter(
    (member) =>
      member.membershipStatus === "Active" &&
      member.membershipExpiryDate &&
      new Date(member.membershipExpiryDate) >= new Date()
  ).length;

  const expiredMemberships = (memberData?.members || []).filter(
    (member) =>
      member.membershipExpiryDate &&
      new Date(member.membershipExpiryDate) < new Date()
  ).length;

  useEffect(() => {
    const controller = new AbortController();

    async function loadMembers() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/admin/members`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to load member accounts.");
        }

        setMemberData(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError.message === "Failed to fetch"
              ? "Cannot connect to the backend. Check that the server is running."
              : requestError.message
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMembers();
    return () => controller.abort();
  }, [token, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPayments() {
      setPaymentsLoading(true);
      setPaymentError("");

      try {
        const response = await fetch(PAYMENTS_API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to load payments.");
        }

        const paymentList = Array.isArray(data) ? data : data.payments;
        if (!Array.isArray(paymentList)) {
          throw new Error("The payment history response was invalid.");
        }
        setPayments(paymentList);
      } catch (error) {
        if (error.name !== "AbortError") {
          setPaymentError(
            error.message === "Failed to fetch"
              ? "Cannot connect to the backend. Check that the server is running."
              : error.message
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPaymentsLoading(false);
        }
      }
    }

    loadPayments();

    return () => controller.abort();
  }, [token, paymentRefreshKey]);

  function startEditing(member) {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setActionMessage("");
    setActionError("");
  }

  function cancelEditing() {
    setEditingMember(null);
    setEditName("");
    setEditEmail("");
  }

  async function saveMember(event) {
    event.preventDefault();
    setActionMessage("");
    setActionError("");

    if (!editName.trim() || !editEmail.trim()) {
      setActionError("Name and email are required.");
      return;
    }

    if (!editingMember) {
      setActionError("Select a member to edit.");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/admin/members/${editingMember._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim().toLowerCase(),
          }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to update member.");
      }

      setMemberData((previous) => ({
        ...previous,
        members: previous.members.map((member) =>
          member._id === editingMember._id
            ? { ...member, ...data.member }
            : member
        ),
      }));

      setActionMessage("Member updated successfully.");
      cancelEditing();
    } catch (error) {
      setActionError(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteMember(member) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${member.name}'s account?`
    );

    if (!confirmed) return;

    setActionMessage("");
    setActionError("");
    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/admin/members/${member._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete member.");
      }

      setMemberData((previous) => ({
        totalMembers: previous.totalMembers - 1,
        members: previous.members.filter(
          (item) => item._id !== member._id
        ),
      }));

      if (editingMember?._id === member._id) {
        cancelEditing();
      }

      setActionMessage("Member deleted successfully.");
    } catch (error) {
      setActionError(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function assignMembership(event) {
    event.preventDefault();
    setMembershipMessage("");
    setMembershipError("");

    if (!selectedMemberId) {
      setMembershipError("Please select a member.");
      return;
    }

    setAssigningMembership(true);

    try {
      const response = await fetch(
        `${MEMBERSHIP_API_URL}/assign/${selectedMemberId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            membershipPlan: selectedPlan,
          }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to assign membership.");
      }

      setMemberData((previous) => ({
        ...previous,
        members: previous.members.map((member) =>
          member._id === selectedMemberId
            ? { ...member, ...data.member }
            : member
        ),
      }));

      setMembershipMessage(
        `Successfully assigned ${selectedPlan} membership to ${data.member.name}.`
      );
      setSelectedMemberId("");
    } catch (error) {
      setMembershipError(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setAssigningMembership(false);
    }
  }

  async function recordPayment(event) {
    event.preventDefault();

    setPaymentMessage("");
    setPaymentError("");

    if (!paymentMemberId) {
      setPaymentError("Please select a member.");
      return;
    }

    if (!paymentAmount || !Number.isFinite(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    setPaymentSubmitting(true);

    try {
      const response = await fetch(PAYMENTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberId: paymentMemberId,
          amount: Number(paymentAmount),
          paymentMethod,
          paymentStatus,
          membershipPlan: paymentPlan,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to record payment.");
      }

      setPaymentMessage("Payment recorded successfully.");
      setPaymentAmount("");
      setPaymentMemberId("");
      setPaymentMethod("UPI");
      setPaymentStatus("Paid");
      setPaymentPlan("MONTHLY");
      setPaymentRefreshKey((key) => key + 1);
    } catch (error) {
      setPaymentError(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <nav className="navbar bg-white site-nav">
        <div className="container">
          <a className="navbar-brand brand-name" href="#admin">
            CBUM<span> FITNESS CLUB</span>
          </a>
          <button className="btn btn-dark" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </nav>

      <div className="container py-5">
        {actionMessage && (
          <div className="alert alert-success" role="status">
            {actionMessage}
          </div>
        )}

        {actionError && (
          <div className="alert alert-danger" role="alert">
            {actionError}
          </div>
        )}

        <p className="section-label">ADMINISTRATION</p>
        <h1 className="auth-title">ADMIN DASHBOARD</h1>
        <p className="auth-description">
          Welcome, {user.name}. Manage your gym from here.
        </p>

        <div className="row g-4 mb-4">
          <div className="col-md-6 col-lg-3">
            <div className="dashboard-card h-100">
              <p className="text-secondary mb-2">Total Revenue</p>
              <h3>
                {paymentsLoading || paymentError
                  ? "—"
                  : `₹${totalRevenue.toLocaleString("en-IN")}`}
              </h3>
              <small className="text-secondary">Paid payments only</small>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="dashboard-card h-100">
              <p className="text-secondary mb-2">Pending Payments</p>
              <h3>
                {paymentsLoading || paymentError
                  ? "—"
                  : `₹${pendingPayments.toLocaleString("en-IN")}`}
              </h3>
              <small className="text-secondary">Awaiting payment</small>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="dashboard-card h-100">
              <p className="text-secondary mb-2">Active Members</p>
              <h3>{loading || !memberData ? "—" : activeMembers}</h3>
              <small className="text-secondary">Valid memberships</small>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="dashboard-card h-100">
              <p className="text-secondary mb-2">Expired Memberships</p>
              <h3>{loading || !memberData ? "—" : expiredMemberships}</h3>
              <small className="text-secondary">
                Membership end date passed
              </small>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="dashboard-card h-100">
              <h5>Members</h5>
              <p>Manage registered gym members.</p>
              <strong>
                {loading || !memberData ? "—" : memberData.totalMembers}
              </strong>
              <span className="badge text-bg-dark ms-2">
                Member Management
              </span>
              {error && (
                <div className="alert alert-danger mt-3 mb-0" role="alert">
                  {error}
                </div>
              )}
              <button
                className="btn btn-outline-dark btn-sm mt-3"
                onClick={() => setRefreshKey((key) => key + 1)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh members"}
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dashboard-card h-100">
              <h5>Membership Plans</h5>
              <p>Review the available gym plans.</p>
              <span className="badge text-bg-dark">
                {plans.length} Plans
              </span>
              <ul className="mt-3 mb-0">
                {plans.map((plan) => (
                  <li key={plan.name}>
                    {plan.name} — {plan.price}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dashboard-card h-100">
              <h5>Payments</h5>
              <p>Record payments and review payment history.</p>

              <strong>
                {paymentsLoading ? "—" : payments.length}
              </strong>

              <span className="badge text-bg-dark ms-2">
                Payment Records
              </span>
              <button
                className="btn btn-outline-dark btn-sm mt-3"
                onClick={() => setPaymentRefreshKey((key) => key + 1)}
                disabled={paymentsLoading}
              >
                {paymentsLoading ? "Loading..." : "Refresh Payments"}
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-card mb-4">
          <h5>Assign Membership</h5>
          <p>Select a registered member and assign a membership plan.</p>

          {membershipMessage && (
            <div className="alert alert-success" role="status">
              {membershipMessage}
            </div>
          )}

          {membershipError && (
            <div className="alert alert-danger" role="alert">
              {membershipError}
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert">
              Load the member list successfully before assigning a plan.
            </div>
          )}

          <form onSubmit={assignMembership}>
            <div className="mb-3">
              <label className="form-label" htmlFor="membership-member">
                Select Member
              </label>

              <select
                id="membership-member"
                className="form-select"
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                required
                disabled={loading || !memberData?.members?.length}
              >
                <option value="">Choose a member</option>

                {memberData?.members?.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="membership-plan">
                Membership Plan
              </label>

              <select
                id="membership-plan"
                className="form-select"
                value={selectedPlan}
                onChange={(event) => setSelectedPlan(event.target.value)}
                required
              >
                <option value="MONTHLY">Monthly — ₹1,500</option>
                <option value="QUARTERLY">Quarterly — ₹4,000</option>
                <option value="YEARLY">Yearly — ₹14,000</option>
              </select>
            </div>

            <button
              className="btn btn-dark"
              type="submit"
              disabled={
                assigningMembership ||
                loading ||
                !memberData?.members?.length
              }
            >
              {assigningMembership ? "Assigning..." : "Assign Plan"}
            </button>
          </form>
        </div>

        <div className="dashboard-card mb-4">
          <h5>Record Payment</h5>
          <p>Enter the payment details for a registered member.</p>

          {paymentMessage && (
            <div className="alert alert-success" role="status">
              {paymentMessage}
            </div>
          )}

          {paymentError && (
            <div className="alert alert-danger" role="alert">
              {paymentError}
            </div>
          )}

          <form onSubmit={recordPayment}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="payment-member">
                  Select Member
                </label>
                <select
                  id="payment-member"
                  className="form-select"
                  value={paymentMemberId}
                  onChange={(event) => setPaymentMemberId(event.target.value)}
                  required
                  disabled={loading || !memberData?.members?.length}
                >
                  <option value="">Choose a member</option>
                  {memberData?.members?.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="payment-amount">
                  Amount (₹)
                </label>
                <input
                  id="payment-amount"
                  className="form-control"
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="payment-plan">
                  Membership Plan
                </label>
                <select
                  id="payment-plan"
                  className="form-select"
                  value={paymentPlan}
                  onChange={(event) => setPaymentPlan(event.target.value)}
                  required
                >
                  <option value="MONTHLY">Monthly — ₹1,500</option>
                  <option value="QUARTERLY">Quarterly — ₹4,000</option>
                  <option value="YEARLY">Yearly — ₹14,000</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="payment-method">
                  Payment Method
                </label>
                <select
                  id="payment-method"
                  className="form-select"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  required
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="payment-status">
                  Payment Status
                </label>
                <select
                  id="payment-status"
                  className="form-select"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                  required
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <button
              className="btn btn-dark mt-4"
              type="submit"
              disabled={
                paymentSubmitting || loading || !memberData?.members?.length
              }
            >
              {paymentSubmitting ? "Recording..." : "Record Payment"}
            </button>
          </form>
        </div>

        <div className="dashboard-card mb-4">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h5 className="mb-0">Payment History</h5>
            <button
              className="btn btn-outline-dark btn-sm"
              onClick={() => setPaymentRefreshKey((key) => key + 1)}
              disabled={paymentsLoading}
            >
              {paymentsLoading ? "Loading..." : "Refresh Payments"}
            </button>
          </div>

          {paymentError && (
            <div className="alert alert-danger" role="alert">
              {paymentError}
            </div>
          )}

          {paymentsLoading ? (
            <p>Loading payment history...</p>
          ) : payments.length === 0 ? (
            <p className="text-secondary mb-0">No payment records found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table dashboard-table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Method</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        {payment.member?.name || "Unknown"}
                        <br />
                        <small className="text-secondary">
                          {payment.member?.email || ""}
                        </small>
                      </td>
                      <td>{payment.membershipPlan}</td>
                      <td>
                        ₹{Number(payment.amount).toLocaleString("en-IN")}
                      </td>
                      <td>{payment.paymentMethod}</td>
                      <td>
                        <span
                          className={`badge ${
                            payment.paymentStatus === "Paid"
                              ? "text-bg-success"
                              : "text-bg-warning"
                          }`}
                        >
                          {payment.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {payment.paymentDate
                          ? new Date(payment.paymentDate).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {memberData?.members.length > 0 && (
          <div className="dashboard-card mb-4">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <h5 className="mb-0">Registered Members</h5>
              <span className="text-secondary">
                {memberData.totalMembers} total
              </span>
            </div>
            <div className="table-responsive">
              <table className="table dashboard-table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Joined</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memberData.members.map((member) => (
                    <tr key={member._id}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-outline-dark btn-sm"
                            onClick={() => startEditing(member)}
                            disabled={actionLoading}
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => deleteMember(member)}
                            disabled={actionLoading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingMember && (
          <div className="dashboard-card mb-4">
            <h5>Edit Member</h5>

            <form onSubmit={saveMember}>
              <div className="mb-3">
                <label className="form-label" htmlFor="edit-member-name">
                  Full Name
                </label>
                <input
                  id="edit-member-name"
                  className="form-control"
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  minLength="2"
                  maxLength="60"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="edit-member-email">
                  Email Address
                </label>
                <input
                  id="edit-member-email"
                  className="form-control"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  required
                />
              </div>

              <button
                className="btn btn-dark me-2"
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>

              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={cancelEditing}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="dashboard-card">
          <h5>Admin Account Details</h5>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <button className="btn btn-outline-dark" onClick={onHome}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberDashboard({ user, onLogout, onHome }) {
  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipError, setMembershipError] = useState("");
  const [selectingPlan, setSelectingPlan] = useState("");
  const [planMessage, setPlanMessage] = useState("");
  const [planError, setPlanError] = useState("");
  const token = localStorage.getItem("cbToken");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMembership() {
      setMembershipLoading(true);
      setMembershipError("");

      try {
        const response = await fetch(
          `${MEMBERSHIP_API_URL}/my-membership`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        const data = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to load membership details.");
        }

        setMembership(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          setMembershipError(
            error.message === "Failed to fetch"
              ? "Cannot connect to the backend. Check that the server is running."
              : error.message
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setMembershipLoading(false);
        }
      }
    }

    loadMembership();
    return () => controller.abort();
  }, [token]);

  function formatMembershipDate(date) {
    return date ? new Date(date).toLocaleDateString() : "—";
  }

  async function selectPlan(planName) {
    setSelectingPlan(planName);
    setPlanMessage("");
    setPlanError("");

    try {
      const response = await fetch(`${MEMBERSHIP_API_URL}/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ membershipPlan: planName }),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to select this plan.");
      }

      setMembership(data);
      setPlanMessage(
        `${planName} membership is active. Payment is not collected here.`
      );
    } catch (error) {
      setPlanError(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setSelectingPlan("");
    }
  }

  return (
    <div className="auth-page">
      <nav className="navbar bg-white site-nav">
        <div className="container">
          <a className="navbar-brand brand-name" href="#member">
            CBUM<span> FITNESS CLUB</span>
          </a>
          <button className="btn btn-dark" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </nav>

      <div className="container py-5">
        <p className="section-label">MEMBER AREA</p>
        <h1 className="auth-title">
          WELCOME, {user.name.toUpperCase()}
        </h1>
        <p className="auth-description">
          Your fitness journey starts here.
        </p>

        <div className="dashboard-card">
          <h5>My Account</h5>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          {membershipError && (
            <div className="alert alert-danger" role="alert">
              {membershipError}
            </div>
          )}
          {membershipLoading ? (
            <p role="status">Loading membership details...</p>
          ) : membership ? (
            <>
              <p>
                <strong>Membership Plan:</strong>{" "}
                {membership.membershipPlan || "Not assigned"}
              </p>
              <p>
                <strong>Start Date:</strong>{" "}
                {formatMembershipDate(membership.membershipStartDate)}
              </p>
              <p>
                <strong>Expiry Date:</strong>{" "}
                {formatMembershipDate(membership.membershipExpiryDate)}
              </p>
              <p>
                <strong>Membership Status:</strong>{" "}
                {membership.membershipStatus || "Not Assigned"}
              </p>
            </>
          ) : null}
          <p>
            <strong>Payment Status:</strong> Not available yet
          </p>
        </div>

        <h2 className="mt-5 mb-3">Available Membership Plans</h2>
        <p>Selecting a plan activates it immediately. Payment is not collected here.</p>

        {planMessage && (
          <div className="alert alert-success" role="status">
            {planMessage}
          </div>
        )}
        {planError && (
          <div className="alert alert-danger" role="alert">
            {planError}
          </div>
        )}

        <div className="row g-4">
          {plans.map((plan) => (
            <div className="col-md-4" key={plan.name}>
              <div className="dashboard-card h-100">
                <h5>{plan.name}</h5>
                <h3>{plan.price}</h3>
                <p>{plan.duration}</p>
                <p>{plan.description}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  className="btn btn-outline-dark"
                  onClick={() => selectPlan(plan.name)}
                  disabled={Boolean(selectingPlan)}
                >
                  {selectingPlan === plan.name
                    ? "Activating..."
                    : `Select ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-dark mt-4"
          onClick={onHome}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("cbUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  function openPage(nextPage) {
    setPage(nextPage);
    setMessage("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleRegister(event) {
    event.preventDefault();
    setMessage("");

    if (name.trim().length < 2) {
      setMessage("Name must contain at least 2 characters.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setMessageType("success");
      setMessage(data.message || "Registration successful!");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setPage("login");
        setMessageType("success");
        setMessage("Registration successful. Please log in.");
      }, 800);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      localStorage.setItem("cbToken", data.token);
      localStorage.setItem("cbUser", JSON.stringify(data.user));
      setLoggedInUser(data.user);
      setPassword("");
      setMessage("");
      setPage("dashboard");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that the server is running."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("cbToken");
    localStorage.removeItem("cbUser");
    setLoggedInUser(null);
    openPage("home");
  }

  // Login page
  if (page === "login") {
    return (
      <AuthLayout onHome={() => openPage("home")}>
        <p className="section-label">WELCOME BACK</p>
        <h1 className="auth-title">MEMBER LOGIN</h1>
        <p className="auth-description">
          Log in to continue your fitness journey.
        </p>

        {message && (
          <div
            className={`alert ${
              messageType === "success" ? "alert-success" : "alert-danger"
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              className="form-control auth-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="form-control auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="btn btn-dark w-100 auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <button
            className="text-link"
            onClick={() => openPage("register")}
          >
            Register here
          </button>
        </p>
      </AuthLayout>
    );
  }

  // Registration page
  if (page === "register") {
    return (
      <AuthLayout onHome={() => openPage("home")}>
        <p className="section-label">BECOME A MEMBER</p>
        <h1 className="auth-title">CREATE ACCOUNT</h1>
        <p className="auth-description">
          Create your account and start your fitness journey.
        </p>

        {message && (
          <div
            className={`alert ${
              messageType === "success" ? "alert-success" : "alert-danger"
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-name">
              Full name
            </label>
            <input
              id="register-name"
              className="form-control auth-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              minLength="2"
              maxLength="60"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="register-email">
              Email address
            </label>
            <input
              id="register-email"
              className="form-control auth-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              className="form-control auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength="8"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              className="form-control auth-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              autoComplete="new-password"
              minLength="8"
              required
            />
          </div>

          <button
            className="btn btn-dark w-100 auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered?{" "}
          <button
            className="text-link"
            onClick={() => openPage("login")}
          >
            Log in
          </button>
        </p>
      </AuthLayout>
    );
  }

  // Separate Admin and Member Dashboards
  if (page === "dashboard" && loggedInUser) {
    return loggedInUser.role === "admin" ? (
      <AdminDashboard
        user={loggedInUser}
        onLogout={handleLogout}
        onHome={() => openPage("home")}
      />
    ) : (
      <MemberDashboard
        user={loggedInUser}
        onLogout={handleLogout}
        onHome={() => openPage("home")}
      />
    );
  }

  // Home page
  return (
    <div className="fitness-site">
      <nav className="navbar navbar-expand-lg navbar-light bg-white sticky-top site-nav">
        <div className="container">
          <a className="navbar-brand brand-name" href="#home">
            CBUM<span> FITNESS CLUB</span>
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
              <li className="nav-item">
                <a className="nav-link" href="#home">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#benefits">Why Us</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#plans">Membership Plans</a>
              </li>
              <li className="nav-item mt-2 mt-lg-0">
                <button
                  className="btn btn-outline-dark nav-button"
                  onClick={() => openPage("login")}
                >
                  Log In
                </button>
              </li>
              <li className="nav-item mt-2 mt-lg-0 mb-2 mb-lg-0">
                <button
                  className="btn btn-dark nav-button"
                  onClick={() => openPage("register")}
                >
                  Register
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <section className="hero-section" id="home">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <p className="section-label">YOUR FITNESS. YOUR JOURNEY.</p>
              <h1 className="hero-title">
                BUILD YOUR
                <br />
                <span>STRONGER</span>
                <br />
                SELF.
              </h1>
              <p className="hero-description">
                Train with purpose. Build strength. Become the best
                version of yourself at CBUM Fitness Club.
              </p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <a href="#plans" className="btn btn-dark btn-lg hero-button">
                  Explore Membership
                </a>
                <a
                  href="#benefits"
                  className="btn btn-outline-dark btn-lg hero-button"
                >
                  Discover Our Gym
                </a>
              </div>
              <div className="hero-note mt-4">
                <span className="note-line"></span>
                DISCIPLINE · CONSISTENCY · PROGRESS
              </div>
            </div>

            <div className="col-lg-6">
              <div className="hero-image-wrap">
                <img
                  className="hero-image"
                  src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1100&q=85"
                  alt="Modern gym with fitness equipment"
                />
                <div className="image-caption">
                  <span>01 / TRAIN WITH PURPOSE</span>
                  <span>EST. FOR YOUR GOALS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container">
          <div className="row text-center g-3">
            {[
              ["01", "YOUR FITNESS JOURNEY"],
              ["100%", "COMMITMENT"],
              ["365", "DAYS TO IMPROVE"],
              ["∞", "POTENTIAL"],
            ].map(([number, label]) => (
              <div className="col-6 col-md-3 stat-item" key={label}>
                <h3>{number}</h3>
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="benefits-section section-padding" id="benefits">
        <div className="container">
          <div className="section-heading">
            <p className="section-label">WHY CBUM FITNESS CLUB</p>
            <h2>
              MORE THAN A GYM.
              <br />
              <span>A PLACE TO GROW.</span>
            </h2>
            <p className="heading-description">
              Everything you need to work towards your fitness goals,
              all in one place.
            </p>
          </div>

          <div className="row g-4 mt-3">
            {[
              ["01", "Quality Equipment", "Train with a range of strength and fitness equipment designed to support your workouts."],
              ["02", "Goal-Focused Training", "Follow your routine, stay consistent, and work towards your personal fitness goals."],
              ["03", "Easy Membership", "Choose a plan and keep track of your membership details through our management system."],
            ].map(([number, title, description], index) => (
              <div className="col-md-4" key={number}>
                <div className="benefit-card">
                  <span className="benefit-number">{number}</span>
                  <div className="benefit-icon">
                    {["↗", "◎", "✓"][index]}
                  </div>
                  <h4>{title}</h4>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="plans-section section-padding" id="plans">
        <div className="container">
          <div className="section-heading text-center">
            <p className="section-label">SIMPLE. FLEXIBLE. EFFECTIVE.</p>
            <h2>
              CHOOSE YOUR
              <br />
              <span>MEMBERSHIP.</span>
            </h2>
            <p className="heading-description mx-auto">
              Find a plan that fits your schedule and your fitness goals.
            </p>
          </div>

          <div className="row g-4 mt-4">
            {plans.map((plan) => (
              <div className="col-lg-4 col-md-6" key={plan.name}>
                <div className={`plan-card ${plan.featured ? "featured-plan" : ""}`}>
                  {plan.featured && (
                    <div className="popular-label">POPULAR CHOICE</div>
                  )}
                  <p className="plan-name">{plan.name}</p>
                  <h3 className="plan-price">{plan.price}</h3>
                  <p className="plan-duration">{plan.duration}</p>
                  <p className="plan-description">{plan.description}</p>
                  <hr />
                  <ul className="plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span className="feature-check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn ${plan.featured ? "btn-light" : "btn-outline-dark"} w-100 plan-button`}
                    onClick={() => openPage("register")}
                  >
                    Choose Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="price-note text-center mt-4">
            Sample prices for this student project. Online payment is not
            enabled in this demo.
          </p>
        </div>
      </section>

      <section className="join-section" id="join">
        <div className="container">
          <div className="join-content">
            <p className="section-label">YOUR NEXT CHAPTER STARTS HERE</p>
            <h2>
              READY TO PUT
              <br />
              IN THE WORK?
            </h2>
            <p>
              Start your fitness journey with CBUM Fitness Club.
              Create your account and take the first step.
            </p>
            <button
              className="btn btn-light btn-lg hero-button"
              onClick={() => openPage("register")}
            >
              Create Your Account
            </button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="row align-items-center gy-3">
            <div className="col-md-6">
              <a className="footer-brand" href="#home">CBUM FITNESS CLUB</a>
              <p className="footer-description">
                Built for strength. Driven by discipline.
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <a href="#home" className="footer-link">Home</a>
              <a href="#benefits" className="footer-link">Why Us</a>
              <a href="#plans" className="footer-link">Membership</a>
              <button
                className="footer-link footer-button"
                onClick={() => openPage("login")}
              >
                Log In
              </button>
            </div>
          </div>
          <hr className="footer-divider" />
          <p className="copyright">
            © {new Date().getFullYear()} CBUM Fitness Club. Student Web
            Technology Project.
          </p>
        </div>
      </footer>
    </div>
  );
}

function AuthLayout({ children, onHome }) {
  return (
    <div className="auth-page">
      <nav className="navbar bg-white site-nav">
        <div className="container">
          <button className="auth-brand" onClick={onHome}>
            CBUM<span> FITNESS CLUB</span>
          </button>
          <button className="btn btn-outline-dark" onClick={onHome}>
            Back to Home
          </button>
        </div>
      </nav>

      <div className="container auth-container">
        <div className="auth-card">{children}</div>
        <p className="auth-footer">
          © {new Date().getFullYear()} CBUM Fitness Club
        </p>
      </div>
    </div>
  );
}

export default App;
