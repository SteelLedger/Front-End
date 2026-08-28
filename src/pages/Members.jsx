import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import {
  Search,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Send,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import MemberDrawer from "../components/MemberDrawer";
import { AdminLocked } from "../components/AdminOnly";
import ConfirmDialog from "../components/ConfirmDialog";
import MenuPopover from "../components/MenuPopover";
import FilterSelect from "../components/FilterSelect";
import { usePageHeader } from "../context/pageHeader";
import { getCurrentUser, getInitials } from "../utils/auth";
import {
  ROLE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  SORTABLE_FIELDS,
  roleLabel,
  statusLabel,
  formatJoined,
  normalizeMember,
  extractMembers,
  emptyMemberForm,
  memberToForm,
  buildMemberPayload,
} from "../utils/members";
import {
  GetUsers,
  inviteUser,
  updateUser,
  DeleteUser,
  resendUserInvite,
} from "../services/apiServices";

const PAGE_SIZE = 10;

/* -------------------------------- pieces ---------------------------------- */

function SortIcon({ active, dir }) {
  return (
    <span className="inline-flex flex-col -space-y-[5px] leading-none">
      <ChevronUp
        size={12}
        strokeWidth={2.5}
        className={
          active && dir === "asc" ? "text-[#1E4D96]" : "text-slate-300"
        }
      />
      <ChevronDown
        size={12}
        strokeWidth={2.5}
        className={
          active && dir === "desc" ? "text-[#1E4D96]" : "text-slate-300"
        }
      />
    </span>
  );
}

/** Header cell. Only fields the API can sort on get a sort button. */
function Th({ label, field, sortBy, sortOrder, onSort, className = "" }) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      {field ? (
        // `uppercase` is repeated here because the preflight resets
        // text-transform on <button>, so it wouldn't inherit from the row.
        <button
          type="button"
          onClick={() => onSort(field)}
          className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-700 ${
            sortBy === field ? "text-[#1E4D96]" : ""
          }`}
        >
          {label}
          <SortIcon active={sortBy === field} dir={sortOrder} />
        </button>
      ) : (
        label
      )}
    </th>
  );
}

/**
 * Per-row ⋮ menu. Which actions exist depends on the row — a pending invite can
 * be resent, and your own row can't be removed — so the items are passed in.
 * The panel is portalled out of the table so the scrolling wrapper can't clip it.
 */
function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const base =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`rounded-md p-2 transition-colors hover:bg-slate-100 hover:text-slate-600 ${
          open ? "bg-slate-100 text-slate-600" : "text-slate-400"
        }`}
      >
        <MoreVertical size={15} />
      </button>

      <MenuPopover
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        align="right"
        width={170}
      >
        {items.map(({ label, icon: Icon, onClick, danger }) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onClick();
            }}
            className={`${base} ${
              danger
                ? "text-rose-600 hover:bg-rose-50"
                : "text-slate-700 hover:bg-blue-50"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </MenuPopover>
    </>
  );
}

function RoleBadge({ role }) {
  const admin = role === "admin";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        admin ? "bg-[#EEF3FB] text-[#1E4D96]" : "bg-slate-100 text-slate-600"
      }`}
    >
      {admin && <ShieldCheck size={12} />}
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }) {
  const accepted = status === "accepted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        accepted
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          accepted ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {statusLabel(status)}
    </span>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Members() {
  const me = getCurrentUser();
  const isAdminUser = me.role === "admin";

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyMemberForm);
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState(null);
  // Which row has a resend in flight, so only its spinner shows.
  const [resendingId, setResendingId] = useState(null);

  // Only admins get the invite button; the topbar falls back to New Sale.
  usePageHeader(
    isAdminUser
      ? { actionLabel: "Add New Member", onAction: () => openAdd() }
      : {},
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersDirty = role !== "all" || status !== "all" || !!query.trim();

  // Is this row the signed-in user? Match on id when the token carries one,
  // otherwise on email — the API blocks self-edits either way, this just keeps
  // the UI from offering an action that's going to bounce.
  const isMe = useCallback(
    (m) =>
      (!!me.id && m.id === me.id) ||
      (!!me.email && m.email.toLowerCase() === me.email),
    [me.id, me.email],
  );

  // Debounce the search box (and reset to page 1).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetUsers({
        search: debouncedQuery || undefined,
        role,
        invitationStatus: status,
        sortBy,
        sortOrder,
        page,
        limit: PAGE_SIZE,
      });
      const { list, total: t } = extractMembers(res);
      setMembers(list.map(normalizeMember));
      setTotal(t);
    } catch (err) {
      setMembers([]);
      setListError(
        err?.response?.status === 403
          ? "Only admins can view members."
          : "Couldn't load members.",
      );
      toast.error(err?.response?.data?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, role, status, sortBy, sortOrder, page]);

  useEffect(() => {
    // A non-admin never gets a list — /users would just 403.
    if (!isAdminUser) {
      setLoading(false);
      return;
    }
    fetchMembers();
  }, [fetchMembers, isAdminUser]);

  /* ------------------------------- handlers ------------------------------- */

  function toggleSort(field) {
    if (!SORTABLE_FIELDS.includes(field)) return;
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setRole("all");
    setStatus("all");
    setQuery("");
    setPage(1);
  }

  function openAdd() {
    setMode("add");
    setEditingId(null);
    setForm(emptyMemberForm());
    setDrawerOpen(true);
  }

  function openEdit(member) {
    setMode("edit");
    setEditingId(member.id);
    setForm(memberToForm(member));
    setDrawerOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = buildMemberPayload(form);
    setSaving(true);
    try {
      if (mode === "add") {
        await inviteUser(payload);
        toast.success(`Invite sent to ${payload.email}`);
      } else {
        await updateUser(editingId, payload);
        toast.success("Member updated");
      }
      setDrawerOpen(false);
      // A new invite belongs at the top of the default (newest-first) sort.
      if (mode === "add" && page !== 1) setPage(1);
      else fetchMembers();
    } catch (err) {
      // 409 (email taken) and 400 (last admin / own role) carry a message
      // worth showing in the form, not just a toast that vanishes.
      const message =
        err?.response?.data?.message ||
        (mode === "add"
          ? "Couldn't send the invite"
          : "Couldn't update member");
      setForm((f) => ({
        ...f,
        error: message,
        errorFields: err?.response?.status === 409 ? ["email"] : [],
      }));
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(member) {
    setConfirmState({
      title: "Remove member?",
      message: `${member.email} will lose access to Ledgr immediately.`,
      confirmLabel: "Remove",
      onConfirm: () => handleRemove(member),
    });
  }

  async function handleRemove(member) {
    try {
      await DeleteUser(member.id);
      toast.success("Member removed");
      // Removing the only row on the last page would leave it empty.
      if (members.length === 1 && page > 1) setPage((n) => n - 1);
      else fetchMembers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't remove member");
    }
  }

  async function handleResend(member) {
    setResendingId(member.id);
    try {
      await resendUserInvite(member.id);
      toast.success(`New temporary password sent to ${member.email}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't resend the invite");
    } finally {
      setResendingId(null);
    }
  }

  /* -------------------------------- render -------------------------------- */

  // Reachable by typing the URL — the nav item itself is admin-only.
  if (!isAdminUser) {
    return (
      <AdminLocked
        title="Members are admin-only"
        message="Ask an admin on your team if you need someone invited or a role changed."
      />
    );
  }

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email…"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm transition-colors focus:border-[#1E4D96] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <FilterSelect
            label="Role"
            value={role}
            onChange={(v) => {
              setRole(v);
              setPage(1);
            }}
            options={ROLE_FILTER_OPTIONS}
            active={role !== "all"}
            width={170}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            active={status !== "all"}
            width={170}
          />
          {filtersDirty && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} /> Reset
            </button>
          )}
        </div>

        {/* Members table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-base font-semibold text-slate-900">
              Team
              <span className="text-xs font-medium text-slate-400">
                {total} {total === 1 ? "member" : "members"}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : listError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-rose-500">
              <p className="text-sm">{listError}</p>
              <button
                type="button"
                onClick={fetchMembers}
                className="mt-2 font-medium text-[#1E4D96] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {filtersDirty
                  ? "No members match these filters."
                  : "No members yet. Invite your first one."}
              </p>
            </div>
          ) : (
            <>
              {/* Phones get cards — the table needs 760px. */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {members.map((m) => {
                  const self = isMe(m);
                  const items = [
                    { label: "Edit", icon: Pencil, onClick: () => openEdit(m) },
                  ];
                  if (m.invitationStatus === "pending") {
                    items.push({
                      label: "Resend invite",
                      icon: Send,
                      onClick: () => handleResend(m),
                    });
                  }
                  if (!self) {
                    items.push({
                      label: "Remove",
                      icon: Trash2,
                      danger: true,
                      onClick: () => confirmRemove(m),
                    });
                  }
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#1E4D96]">
                        {getInitials(m.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-medium text-slate-800">
                          <span className="truncate">{m.email || "—"}</span>
                          {self && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                              You
                            </span>
                          )}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <RoleBadge role={m.role} />
                          <StatusBadge status={m.invitationStatus} />
                          <span className="text-xs text-slate-400">
                            {formatJoined(m.createdAt)}
                          </span>
                        </div>
                      </div>
                      {resendingId === m.id ? (
                        <Loader2
                          size={15}
                          className="animate-spin text-slate-400"
                        />
                      ) : (
                        <RowMenu items={items} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Th label="Member" field="email" {...sortProps} />
                      <Th label="Role" field="role" {...sortProps} />
                      <Th
                        label="Status"
                        field="invitationStatus"
                        {...sortProps}
                      />
                      <Th label="Added on" field="createdAt" {...sortProps} />
                      <Th label="" className="w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m) => {
                      const self = isMe(m);
                      const items = [
                        {
                          label: "Edit",
                          icon: Pencil,
                          onClick: () => openEdit(m),
                        },
                      ];
                      if (m.invitationStatus === "pending") {
                        items.push({
                          label: "Resend invite",
                          icon: Send,
                          onClick: () => handleResend(m),
                        });
                      }
                      if (!self) {
                        items.push({
                          label: "Remove",
                          icon: Trash2,
                          danger: true,
                          onClick: () => confirmRemove(m),
                        });
                      }

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#1E4D96]">
                                {getInitials(m.email)}
                              </span>
                              <p className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-800">
                                {m.email || "—"}
                                {self && (
                                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    You
                                  </span>
                                )}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={m.role} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={m.invitationStatus} />
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatJoined(m.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {resendingId === m.id ? (
                              <Loader2
                                size={15}
                                className="ml-auto animate-spin text-slate-400"
                              />
                            ) : (
                              <RowMenu items={items} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((n) => Math.max(1, n - 1))}
                      aria-label="Previous page"
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((n) => Math.min(totalPages, n + 1))
                      }
                      aria-label="Next page"
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MemberDrawer
        open={drawerOpen}
        mode={mode}
        formState={form}
        setFormState={setForm}
        saving={saving}
        // The API refuses to change your own role, so the drawer doesn't offer it.
        lockRole={
          mode === "edit" &&
          !!editingId &&
          members.some((m) => m.id === editingId && isMe(m))
        }
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          const fn = confirmState?.onConfirm;
          setConfirmState(null);
          fn?.();
        }}
      />
    </div>
  );
}
