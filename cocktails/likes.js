const drinkLikes = (() => {
  let current, opening;
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('homebar-likes') : null;

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

  function attach(drink, button) {
    current = {drink, button};
    const label = button.querySelector('.like-label');
    const counter = button.querySelector('.like-count');
    let feedbackTimer;

    button.onclick = async () => {
      try {
        const count = await countFor(await database(), drink.slug, true);
        counter.textContent = String(count);
        label.textContent = '已点赞';
        button.classList.add('just-liked');
        channel?.postMessage(drink.slug);
      } catch {
        label.textContent = '保存失败，请重试';
        button.classList.remove('just-liked');
      }
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        label.textContent = '点赞';
        button.classList.remove('just-liked');
      }, 1600);
    };
    refresh();
  }

  if (channel) channel.onmessage = event => {
    if (event.data === current?.drink.slug) refresh();
  };
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  return {attach};
})();
