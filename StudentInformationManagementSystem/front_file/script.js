const isApiHost = window.location.port === "3010";
const apiHost = window.location.hostname || "localhost";
const apiBase = isApiHost ? "" : `http://${apiHost}:3010`;
const studentUrl = `${apiBase}/api/student`;
const userUrl = `${apiBase}/api/users`;

const getCookie = name => document.cookie.split("; ").find(row => row.startsWith(`${name}=`))?.split("=")[1];
async function prepareCsrf() {
  const response = await fetch(`${apiBase}/api/csrf-token`, { credentials: "include" });
  if (!response.ok) throw new Error("The API server must be restarted to enable CSRF protection.");
  const token = getCookie("XSRF-TOKEN");
  if (!token) throw new Error("Could not prepare secure form token. Please refresh the page.");
  return decodeURIComponent(token);
}
async function request(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", await prepareCsrf());
  return fetch(url, { ...options, method, headers, credentials: "include" });
}
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

const loginForm = document.querySelector("#loginform"), registerForm = document.querySelector("#registerform");
if (loginForm) loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await readResponse(await request(`${userUrl}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: document.querySelector("#loginname").value.trim(), password: document.querySelector("#loginpassword").value }) }));
    window.location.href = "home.html";
  } catch (error) { alert(error.message); }
});
if (registerForm) registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = await readResponse(await request(`${userUrl}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: document.querySelector("#registername").value.trim(), email: document.querySelector("#registeremail").value.trim(), password: document.querySelector("#registerpassword").value }) }));
    alert(data.message); window.location.href = "index.html";
  } catch (error) { alert(error.message); }
});

if (document.querySelector("#studentApp")) {
  const overlay = document.querySelector(".mainHover"), viewModal = document.querySelector(".viewStudent"), addModal = document.querySelector("#addModal"), updateModal = document.querySelector("#updateModal"), logoutModal = document.querySelector("#logoutModal");
  let currentPage = 1, currentSearch = "";
  const profileUrl = file => file ? `${apiBase}/uploads/${encodeURIComponent(file)}` : "";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const show = modal => { overlay.classList.add("is-visible"); modal.classList.add("is-open"); };
  window.closeModals = () => { [viewModal, addModal, updateModal, logoutModal].forEach(modal => modal.classList.remove("is-open")); overlay.classList.remove("is-visible"); };
  window.openAddForm = () => { document.querySelector("#addForm").reset(); show(addModal); };
  window.logoutForm = () => show(logoutModal);
  window.confirmLogout = async () => {
    const button = document.querySelector("#confirmLogoutButton"); button.disabled = true; button.textContent = "Signing out…";
    try { await request(`${userUrl}/logout`, { method: "POST" }); } finally { window.location.replace("index.html"); }
  };
  overlay.onclick = closeModals;
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeModals(); });
  async function getStudent(id) { return readResponse(await request(`${studentUrl}/${id}`)); }
  async function fetchStudents(search = "", page = 1) {
    currentSearch = search;
    try {
      const data = await readResponse(await request(`${studentUrl}?search=${encodeURIComponent(search)}&page=${page}&limit=6`)); currentPage = data.page;
      document.querySelector("#tbody").innerHTML = data.student.map(s => `<tr><td><div class="avatar">${s.profile_pic ? `<img src="${profileUrl(s.profile_pic)}" alt="${escapeHtml(s.name)}">` : escapeHtml(s.name[0])}</div></td><td><strong>${escapeHtml(s.name)}</strong></td><td>${escapeHtml(s.email)}</td><td>${escapeHtml(s.phone)}</td><td><span class="badge">${escapeHtml(s.gender)}</span></td><td class="action-cell"><button class="icon-button view" onclick="viewStudent('${s._id}')">View</button><button class="icon-button edit" onclick="openUpdateForm('${s._id}')">Edit</button><button class="icon-button delete" onclick="deleteStudent('${s._id}')">Delete</button></td></tr>`).join("") || '<tr><td class="empty-state" colspan="6">No students found. Add your first student to get started.</td></tr>';
      const pager = document.querySelector("#pagination"); pager.replaceChildren(); for (let p = 1; p <= data.totalPage; p++) { const b = document.createElement("button"); b.textContent = p; b.className = p === currentPage ? "is-active" : ""; b.onclick = () => fetchStudents(currentSearch, p); pager.append(b); }
    } catch (error) { if (error.message.includes("session") || error.message.includes("Authentication")) window.location.href = "index.html"; else alert(error.message); }
  }
  window.viewStudent = async id => { try { const s = await getStudent(id), image = document.querySelector("#viewImage"); image.src = profileUrl(s.profile_pic); image.hidden = !s.profile_pic; document.querySelector("#viewInitial").hidden = !!s.profile_pic; document.querySelector("#viewInitial").textContent = s.name[0]; document.querySelector("#viewName").textContent = s.name; document.querySelector("#viewEmail").textContent = s.email; document.querySelector("#viewPhone").textContent = s.phone; document.querySelector("#viewGender").textContent = s.gender; show(viewModal); } catch (error) { alert(error.message); } };
  window.openUpdateForm = async id => { try { const s = await getStudent(id); document.querySelector("#hiddenStudentId").value = s._id; ["name", "email", "phone", "gender"].forEach(key => document.querySelector(`#update${key[0].toUpperCase()}${key.slice(1)}`).value = s[key]); document.querySelector("#updateProfilePic").value = ""; show(updateModal); } catch (error) { alert(error.message); } };
  window.deleteStudent = async id => { if (!confirm("Delete this student? This cannot be undone.")) return; try { await readResponse(await request(`${studentUrl}/${id}`, { method: "DELETE" })); fetchStudents(currentSearch, currentPage); } catch (error) { alert(error.message); } };
  async function save(form, url, method) { await readResponse(await request(url, { method, body: new FormData(form) })); closeModals(); form.reset(); fetchStudents(currentSearch, 1); }
  document.querySelector("#addForm").onsubmit = async e => { e.preventDefault(); try { await save(e.currentTarget, studentUrl, "POST"); } catch (error) { alert(error.message); } };
  document.querySelector("#updateForm").onsubmit = async e => { e.preventDefault(); try { await save(e.currentTarget, `${studentUrl}/${document.querySelector("#hiddenStudentId").value}`, "PUT"); } catch (error) { alert(error.message); } };
  document.querySelector("#searchInput").oninput = e => fetchStudents(e.target.value, 1);
  fetchStudents();
}
