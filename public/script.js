document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userForm');
    const loadUsersBtn = document.getElementById('loadUsers');
    const usersList = document.getElementById('usersList');

    // Load users
    loadUsersBtn.addEventListener('click', loadUsers);

    // Add user
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        addUser(name, email);
    });

    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            displayUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async function addUser(name, email) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email })
            });
            const newUser = await response.json();
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            loadUsers(); // Reload the list
        } catch (error) {
            console.error('Error adding user:', error);
        }
    }

    function displayUsers(users) {
        usersList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-item';
            li.innerHTML = `
                <span>${user.name} (${user.email})</span>
                <button class="delete-btn" data-id="${user.id}">Delete</button>
            `;
            usersList.appendChild(li);
        });

        // Add delete event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                deleteUser(id);
            });
        });
    }

    async function deleteUser(id) {
        try {
            await fetch(`/api/users/${id}`, {
                method: 'DELETE'
            });
            loadUsers(); // Reload the list
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }

    // Load users on page load
    loadUsers();
});