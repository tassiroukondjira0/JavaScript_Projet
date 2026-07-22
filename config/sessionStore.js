const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const session = require('express-session');

/**
 * Simple file-backed session store.
 * Contract with express-session:
 * - get(sid, cb)
 * - set(sid, sessionObj, cb)
 * - destroy(sid, cb)
 * - touch(sid, sessionObj, cb) (optional but implemented)
 *
 * Stores an object keyed by sid in a JSON file.
 */
class FileSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.filePath = options.path || path.join(__dirname, 'sessions.json');
    this._ready = false;
    this._data = {}; // { [sid]: sessionObj }
    this._queue = Promise.resolve();

    this._load().catch((err) => {
      // If it fails on startup, we'll still try later on demand.
      console.error('[FileSessionStore] initial load failed:', err);
    });
  }

  async _load() {
    if (this._ready) return;
    try {
      const raw = await fsp.readFile(this.filePath, 'utf8');
      this._data = raw ? JSON.parse(raw) : {};
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        this._data = {};
        await this._commit();
      } else {
        throw err;
      }
    } finally {
      this._ready = true;
    }
  }

  async _commit() {
    const dir = path.dirname(this.filePath);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(this.filePath, JSON.stringify(this._data, null, 2), 'utf8');
  }

  _enqueueWrite(fn) {
    this._queue = this._queue.then(fn, fn);
    return this._queue;
  }

  get(sid, callback) {
    this._load()
      .then(() => {
        const sess = this._data[sid];
        callback(null, sess || null);
      })
      .catch((err) => callback(err));
  }

  set(sid, sessionObj, callback) {
    this._load()
      .then(() => {
        this._data[sid] = sessionObj;
        return this._enqueueWrite(() => this._commit());
      })
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  destroy(sid, callback) {
    this._load()
      .then(() => {
        delete this._data[sid];
        return this._enqueueWrite(() => this._commit());
      })
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  touch(sid, sessionObj, callback) {
    // express-session calls touch() to update expiration without changing data,
    // but we persist the whole object for simplicity.
    return this.set(sid, sessionObj, callback);
  }

}

module.exports = FileSessionStore;

