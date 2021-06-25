var STORAGE_KEY = 'lifecycle-state:' + location.pathname;

var getStoredState = function getStoredState() {
    var storedState;
    try {
        storedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (err) {
        // Do nothing.
    }
    return storedState || [];
};

var appendStoredState = function appendStoredState(state, date) {
    var stateHistory = getStoredState();

    stateHistory.push({ state: state, date: date });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateHistory));
};

var clearStoredState = function clearStoredState() {
    localStorage.removeItem(STORAGE_KEY);
};

var updateDisplayedState = function updateDisplayedState() {
    var addRow = function(entry) {
        var tr = document.createElement('tr');
        var td1 = document.createElement('td');
        var td2 = document.createElement('td');
        td1.innerText = entry.state;
        td2.innerText = entry.date;
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    };
    var removeRow = function(row) {
        row.parentNode.removeChild(row);
    };

    var tbody = document.getElementById('output');
    var entries = getStoredState();
    var rows = [].slice.call(tbody.children);
    var min = Math.min(entries.length, rows.length);
    var max = Math.max(entries.length, rows.length);

    for (var i = min; i < max; i++) {
        if (i >= rows.length) {
            addRow(entries[i]);
        } else {
            removeRow(rows[i]);
        }
    }
};

document.getElementById('clear').onclick = function() {
    clearStoredState();
    updateDisplayedState();
};

updateDisplayedState();

// Subscribe to lifecycle state changes.
cotonic.broker.subscribe("model/lifecycle/event/state", function(m) {
    appendStoredState(m.payload, new Date().toISOString());

    updateDisplayedState();
})


