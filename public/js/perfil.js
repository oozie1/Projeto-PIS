function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "block";
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

function openEditModal(id, nome, isAdmin) {
    const nomeInput = document.getElementById("editNome");
    if (nomeInput) nomeInput.value = nome;

    const editForm = document.getElementById("editForm");
    if (editForm) editForm.action = "/auth/admin/update-full/" + id;

    const deleteForm = document.getElementById("deleteForm");
    if (deleteForm) deleteForm.action = "/auth/admin/delete/" + id;

    const adminSelect = document.getElementById("editAdminStatus");
    if (adminSelect) {
        const isAdm = (isAdmin === 'true' || isAdmin === '1' || isAdmin === true || isAdmin === 1);
        adminSelect.value = isAdm ? '1' : '0';
    }

    openModal('editModal');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

function openEditListModal(id, nome) {
    document.getElementById('editListId').value = id;
    document.getElementById('editListName').value = nome;
    openModal('editListModal');
}