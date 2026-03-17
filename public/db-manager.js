document.addEventListener('DOMContentLoaded', () => {
    const loadTablesBtn = document.getElementById('loadTables');
    const tablesList = document.getElementById('tablesList');
    const runQueryBtn = document.getElementById('runQuery');
    const sqlQuery = document.getElementById('sqlQuery');
    const queryResult = document.getElementById('queryResult');

    // Load tables
    loadTablesBtn.addEventListener('click', loadTables);

    // Run query
    runQueryBtn.addEventListener('click', () => {
        const query = sqlQuery.value.trim();
        if (query) {
            runQuery(query);
        } else {
            alert('Please enter a SQL query.');
        }
    });

    async function loadTables() {
        try {
            const response = await fetch('/api/tables');
            const tables = await response.json();
            displayTables(tables);
        } catch (error) {
            console.error('Error loading tables:', error);
            queryResult.textContent = 'Error loading tables: ' + error.message;
        }
    }

    function displayTables(tables) {
        tablesList.innerHTML = '';
        tables.forEach(table => {
            const li = document.createElement('li');
            li.textContent = table;
            li.className = 'table-item';
            li.addEventListener('click', () => {
                sqlQuery.value = `SELECT * FROM ${table} LIMIT 10;`;
            });
            tablesList.appendChild(li);
        });
    }

    async function runQuery(query) {
        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });
            const result = await response.json();
            displayResult(result);
        } catch (error) {
            console.error('Error running query:', error);
            queryResult.textContent = 'Error: ' + error.message;
        }
    }

    function displayResult(result) {
        if (result.error) {
            queryResult.textContent = 'Error: ' + result.error;
        } else if (result.affectedRows !== undefined) {
            queryResult.textContent = `Query executed successfully. Affected rows: ${result.affectedRows}`;
        } else {
            // Display as table
            let html = '<table><thead><tr>';
            if (result.length > 0) {
                Object.keys(result[0]).forEach(key => {
                    html += `<th>${key}</th>`;
                });
                html += '</tr></thead><tbody>';
                result.forEach(row => {
                    html += '<tr>';
                    Object.values(row).forEach(value => {
                        html += `<td>${value}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
            } else {
                html = 'No results.';
            }
            queryResult.innerHTML = html;
        }
    }
});