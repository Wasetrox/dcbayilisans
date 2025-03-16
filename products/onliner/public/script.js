document.getElementById('loadData').addEventListener('click', async () => {
  const dataType = document.getElementById('dataType').value;
  const response = await fetch(`/api/data/${dataType}`);
  const data = await response.json();
  
  const container = document.getElementById('dataContainer');
  container.innerHTML = '';

  data.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'data-item';
    div.innerHTML = `
      ${item} 
      <button onclick="deleteItem('${dataType}', ${index})">Sil</button>
    `;
    container.appendChild(div);
  });
});

document.getElementById('addButton').addEventListener('click', async () => {
  const dataType = document.getElementById('dataType').value;
  const newItem = document.getElementById('newItem').value;

  if (!newItem) {
    alert('Lütfen bir öğe girin.');
    return;
  }

  await fetch(`/api/data/${dataType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: newItem }),
  });

  document.getElementById('newItem').value = '';
  document.getElementById('loadData').click(); // Verileri yeniden yükle
});

async function deleteItem(dataType, index) {
  await fetch(`/api/data/${dataType}/${index}`, { method: 'DELETE' });
  document.getElementById('loadData').click(); // Verileri yeniden yükle
}

// Modal açma ve kapama
const modal = document.getElementById('tokenModal');
const openModalBtn = document.querySelector('.primary');
const closeModalBtn = document.getElementById('closeModal');

openModalBtn.addEventListener('click', () => {
  modal.classList.add('show');
});

closeModalBtn.addEventListener('click', () => {
  modal.classList.remove('show');
});
