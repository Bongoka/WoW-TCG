// Temporärer Simulations-Pool (wird nach der Deck-Analyse gelöscht)
(() => {
    window.simPool = window.simPool || [];
    window.simSeq = window.simSeq || 0;
    window.simRun = function (jobs, nWorkers = 8) {
        nWorkers = Math.max(1, Math.min(nWorkers, jobs.length));
        while (window.simPool.length < nWorkers) {
            const w = new Worker('/addon/_simworker.js?v=1');
            window.simPool.push(w);
        }
        const groups = Array.from({ length: nWorkers }, () => []);
        jobs.forEach((j, i) => groups[i % nWorkers].push(j));
        return Promise.all(groups.map((g, wi) => new Promise((resolve, reject) => {
            if (!g.length) return resolve([]);
            const w = window.simPool[wi];
            const id = ++window.simSeq;
            const to = setTimeout(() => { w.removeEventListener('message', on); reject(new Error('worker timeout')); }, 600000);
            const on = (e) => {
                const d = e.data;
                if (d.type === 'done' && d.id === id) { clearTimeout(to); w.removeEventListener('message', on); resolve(d.jobs); }
                else if (d.type === 'error') { clearTimeout(to); w.removeEventListener('message', on); reject(new Error(d.message)); }
            };
            w.addEventListener('message', on);
            w.postMessage({ type: 'run', id, jobs: g });
        }))).then(gs => gs.flat());
    };
})();
