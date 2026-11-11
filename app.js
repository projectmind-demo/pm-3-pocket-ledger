const STORAGE_KEY = 'pocket-ledger-records-v1';
const categories = [
  { name: '餐饮', icon: '🍜' }, { name: '交通', icon: '🚌' }, { name: '购物', icon: '🛍️' },
  { name: '住房', icon: '🏠' }, { name: '娱乐', icon: '🎬' }, { name: '医疗', icon: '💊' }, { name: '其他', icon: '📦' }
];
let records = loadRecords();
let editingId = null;
let selectedDate = '';

const $ = (id) => document.getElementById(id);
const today = () => { const now = new Date(); const offset = now.getTimezoneOffset(); return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10); };
const money = (value) => `¥${Number(value).toFixed(2)}`;
const dateText = (value) => { const [y, m, d] = value.split('-'); return `${y}年${Number(m)}月${Number(d)}日`; };
const category = (name) => categories.find((item) => item.name === name) || categories.at(-1);

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.map(normalizeRecord).filter(Boolean) : [];
  }
  catch { return []; }
}
function normalizeRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const amount = Number(record.amount);
  const date = typeof record.date === 'string' ? record.date : '';
  const normalizedAmount = Math.round(amount * 100) / 100;
  if (!Number.isFinite(amount) || !Number.isFinite(normalizedAmount) || amount <= 0 || !isValidDate(date)) return null;
  return {
    id: typeof record.id === 'string' && record.id ? record.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    amount: normalizedAmount,
    category: categories.some((item) => item.name === record.category) ? record.category : '其他',
    date,
    note: typeof record.note === 'string' ? record.note.slice(0, 60) : '',
    createdAt: Number.isFinite(Number(record.createdAt)) ? Number(record.createdAt) : 0
  };
}
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); return true; }
  catch { showToast('记录无法保存，请检查浏览器存储权限。'); return false; }
}
function monthValue() { return $('monthFilter').value || today().slice(0, 7); }
function showToast(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200); }

function renderCategories() {
  $('categoryOptions').innerHTML = categories.map((item) => `<div class="category-option"><input type="radio" id="cat-${item.name}" name="category" value="${item.name}"><label for="cat-${item.name}"><span>${item.icon}</span>${item.name}</label></div>`).join('');
}
function render() {
  const current = today(); const month = monthValue();
  $('todayLabel').textContent = dateText(current);
  const todayRecords = records.filter((record) => record.date === current);
  $('todayTotal').textContent = Number(todayRecords.reduce((sum, record) => sum + record.amount, 0)).toFixed(2);
  $('todayCount').textContent = todayRecords.length ? `${todayRecords.length} 笔消费记录` : '今天还没有记录';
  const monthRecords = records.filter((record) => record.date.startsWith(month));
  const monthSum = monthRecords.reduce((sum, record) => sum + record.amount, 0);
  $('monthTotal').textContent = money(monthSum); $('monthCount').textContent = `${monthRecords.length} 笔记录`;
  const days = new Set(monthRecords.map((record) => record.date)).size;
  $('averageTotal').textContent = money(days ? monthSum / days : 0); $('averageHint').textContent = days ? `按 ${days} 个有记录日计算` : '按有记录天数计算';
  const visible = selectedDate ? records.filter((record) => record.date === selectedDate) : [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8);
  $('clearFilter').classList.toggle('hidden', !selectedDate);
  $('recordList').innerHTML = visible.length ? visible.map(recordTemplate).join('') : `<div class="empty-state"><div class="empty-icon">＋</div><strong>${selectedDate ? '这一天还没有记录' : '还没有消费记录'}</strong><p>${selectedDate ? '换个日期看看，或新增一笔消费。' : '记录第一笔消费，开始掌握自己的日常开支。'}</p></div>`;
}
function recordTemplate(record) {
  const item = category(record.category);
  const id = escapeHtml(record.id);
  return `<article class="record-item"><div class="category-icon">${item.icon}</div><div class="record-main"><div class="record-name">${escapeHtml(item.name)}</div><div class="record-note">${escapeHtml(record.note || '未添加备注')}</div></div><div class="record-side"><div class="record-amount">${money(record.amount)}</div><div class="record-date">${dateText(record.date)}</div></div><div class="record-actions"><button class="text-button" data-action="edit" data-id="${id}" type="button">编辑</button><button class="text-button delete" data-action="delete" data-id="${id}" type="button">删除</button></div></article>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
function openForm(record) {
  editingId = record?.id || null; $('formTitle').textContent = editingId ? '编辑记账' : '新增记账'; $('saveButton').textContent = editingId ? '保存修改' : '保存记录'; $('formMessage').className = 'form-message'; $('formMessage').textContent = '';
  $('amount').value = record?.amount ?? ''; $('expenseDate').value = record?.date || today(); $('note').value = record?.note || ''; document.querySelectorAll('input[name="category"]').forEach((input) => { input.checked = input.value === record?.category; }); $('formModal').classList.remove('hidden');
  $('amount').focus(); $('amount').select();
}
function closeForm() { $('formModal').classList.add('hidden'); editingId = null; }
function submitForm(event) {
  event.preventDefault(); const rawAmount = $('amount').value.trim(); const amount = Number(rawAmount); const chosen = document.querySelector('input[name="category"]:checked'); const message = $('formMessage');
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(rawAmount) || !Number.isFinite(amount) || amount <= 0) { message.textContent = '请输入大于 0 的有效金额，最多保留两位小数。'; message.className = 'form-message error'; $('amount').focus(); return; }
  if (!chosen) { message.textContent = '请选择一个消费分类。'; message.className = 'form-message error'; return; }
  const date = $('expenseDate').value || today();
  if (!isValidDate(date)) { message.textContent = '请选择有效的消费日期。'; message.className = 'form-message error'; $('expenseDate').focus(); return; }
  const normalizedAmount = Math.round(amount * 100) / 100;
  if (!Number.isFinite(normalizedAmount)) { message.textContent = '请输入不超过合理范围的金额。'; message.className = 'form-message error'; $('amount').focus(); return; }
  const data = { amount: normalizedAmount, category: chosen.value, date, note: $('note').value.trim().slice(0, 60), createdAt: Date.now() };
  if (editingId) {
    const index = records.findIndex((record) => record.id === editingId);
    if (index === -1) { closeForm(); render(); showToast('记录不存在，可能已被删除。'); return; }
    const previous = records[index]; records[index] = { ...previous, ...data };
    if (!persist()) { records[index] = previous; return; }
    showToast('记录已更新');
  }
  else {
    const next = { ...data, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` }; records.push(next);
    if (!persist()) { records.pop(); return; }
    showToast('记录保存成功');
  }
  closeForm(); render();
}

renderCategories(); $('monthFilter').value = today().slice(0, 7); render();
$('openAdd').addEventListener('click', () => openForm()); $('closeModal').addEventListener('click', closeForm); $('expenseForm').addEventListener('submit', submitForm); $('monthFilter').addEventListener('change', render);
$('dateFilter').addEventListener('change', (event) => { selectedDate = event.target.value; render(); }); $('clearFilter').addEventListener('click', () => { selectedDate = ''; $('dateFilter').value = ''; render(); });
$('formModal').addEventListener('click', (event) => { if (event.target === $('formModal')) closeForm(); });
$('recordList').addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (!button) return; const record = records.find((item) => item.id === button.dataset.id); if (!record) return; if (button.dataset.action === 'edit') openForm(record); else if (confirm(`确定删除这笔 ${money(record.amount)} 的${record.category}记录吗？`)) { records = records.filter((item) => item.id !== record.id); persist(); render(); showToast('记录已删除'); } });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('formModal').classList.contains('hidden')) closeForm(); });
