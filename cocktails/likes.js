const drinkLikes = (() => {
  const dialog = document.getElementById('like-dialog');
  const form = document.getElementById('like-form');
  const password = document.getElementById('like-password');
  const message = document.getElementById('like-message');
  const submit = document.getElementById('like-submit');
  const cancel = document.getElementById('like-cancel');
  const hexBytes = hex => Uint8Array.from(hex.match(/../g), pair => parseInt(pair, 16));
  const salt = hexBytes('846c7ec73ef7a69258bf818e7030dacd');
  const verifier = hexBytes('7e765f1d5bd0f9cd5121662b83fb1b8f1400a97d64fb7ab0934b6df0f870dc3d');
  let current, prompt, opening;
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('homebar-likes') : null;

  async function matchesPassword(value) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000}, key, 256);
    return new Uint8Array(bits).every((byte, i) => byte === verifier[i]);
  }

  function database() {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open('cains-homebar-likes', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('counts');
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => { db.close(); opening = null; };
          db.onclose = () => { opening = null; };
          resolve(db);
        };
        request.onerror = () => reject(request.error);
      }).catch(error => { opening = null; throw error; });
    }
    return opening;
  }

  // Read and increment in the same transaction so simultaneous taps in different tabs both count.
  function countFor(db, slug, increment = false) {
    return new Promise((resolve, reject) => {
      const txn = db.transaction('counts', increment ? 'readwrite' : 'readonly');
      const store = txn.objectStore('counts');
      const read = store.get(slug);
      let count;
      read.onsuccess = () => {
        count = read.result ?? 0;
        if (increment) store.put(++count, slug);
      };
      txn.oncomplete = () => resolve(count);
      txn.onabort = () => reject(txn.error || new Error('Storage unavailable'));
    });
  }

  async function refresh() {
    const view = current;
    if (!view?.button.isConnected) return;
    const counter = view.button.querySelector('.like-count');
    try {
      counter.textContent = String(await countFor(await database(), view.drink.slug));
    } catch {
      counter.textContent = '—';
    }
  }

  function close() {
    if (dialog.open) dialog.close();
    prompt = null;
    form.reset();
    password.removeAttribute('aria-invalid');
    message.textContent = '';
    submit.disabled = false;
    cancel.disabled = false;
    submit.textContent = '确认点赞';
  }

  function attach(drink, button) {
    current = {drink, button};
    button.onclick = () => {
      prompt = {drink, button};
      document.getElementById('like-drink').textContent = drink.name;
      dialog.showModal();
      password.focus();
    };
    refresh();
  }

  cancel.onclick = close;
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (!cancel.disabled) close();
  });
  password.oninput = () => { password.removeAttribute('aria-invalid'); message.textContent = ''; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const attempt = prompt;
    if (!attempt || submit.disabled) return;
    submit.disabled = true;
    submit.textContent = '验证中…';
    message.textContent = '';
    try {
      const valid = await matchesPassword(password.value);
      if (prompt !== attempt) return;
      if (!valid) {
        password.value = '';
        password.setAttribute('aria-invalid', 'true');
        message.textContent = '密码不对，请重新输入。';
        password.focus();
        return;
      }
      const db = await database();
      if (prompt !== attempt) return;
      cancel.disabled = true;
      const count = await countFor(db, attempt.drink.slug, true);
      channel?.postMessage(attempt.drink.slug);
      if (prompt !== attempt) return;
      const button = attempt.button;
      button.querySelector('.like-count').textContent = String(count);
      button.querySelector('.like-label').textContent = '已点赞';
      button.classList.add('just-liked');
      clearTimeout(attempt.button.likeTimer);
      button.likeTimer = setTimeout(() => {
        button.querySelector('.like-label').textContent = '点赞';
        button.classList.remove('just-liked');
      }, 1600);
      close();
    } catch {
      if (prompt === attempt) message.textContent = '未能保存点赞，请检查浏览器设置后重试。';
    } finally {
      if (prompt === attempt) {
        submit.disabled = false;
        cancel.disabled = false;
        submit.textContent = '确认点赞';
      }
    }
  });
  if (channel) channel.onmessage = event => {
    if (event.data === current?.drink.slug) refresh();
  };
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  return {attach, close};
})();
