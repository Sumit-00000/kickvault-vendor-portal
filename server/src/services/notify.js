const { db } = require('../db');

function notify(userId, message) {
  db.prepare('INSERT INTO notifications (userId, message) VALUES (?, ?)').run(
    userId,
    message
  );
}

function notifyAdmins(message) {
  const admins = db
    .prepare("SELECT id FROM users WHERE role = 'admin'")
    .all();
  for (const admin of admins) {
    notify(admin.id, message);
  }
}

module.exports = { notify, notifyAdmins };
