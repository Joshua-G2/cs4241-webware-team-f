import React, { useState, useEffect } from 'react';


function DataDisplay() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        // Fetch from your Node.js backend
        fetch('http://localhost:5000/api/data')
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>My MongoDB Data</h2>

            <ul>
                {items.map((item) => (
                    <li key={item._id}>
                        <strong>{item.name}</strong>: {item.value}
                    </li>
                ))}
            </ul>

        </div>
    );
}

export default DataDisplay;